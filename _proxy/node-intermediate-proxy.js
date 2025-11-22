/**
 * Intermediate Proxy Server with Streaming and Global Priority Queue
 *
 * Forwards requests to multiple proxy servers with automatic failover
 * Client -> This Proxy -> Main Proxy (with priority queue) -> Target URL
 *
 * How it works:
 * - Global priority queue shared across all requests
 * - Each new request gets a snapshot of current queue order + version
 * - Failed proxy moves to END of global queue (affects NEW requests)
 * - Current requests continue with their snapshot unaffected
 * - Queue versioning: only the FIRST request to modify queue succeeds
 *   - Request A (version 1) and Request B (version 1) start simultaneously
 *   - Request A fails first -> moves proxy to end, version becomes 2
 *   - Request B tries to move proxy -> version mismatch, ignores
 *   - Only NEW requests (version 2) can modify queue further
 * - Reserve proxies: emergency backup proxies always at end of queue
 *   - Set via RESERVE_PROXY_URL env variable
 *   - Track usage count for monitoring
 *   - Never move above regular proxies
 * - Health check shows current global queue order, version, and stats
 *
 * Usage: node intermediate-proxy.js
 * Default port: 3000
 * Set PROXY_URL to comma-separated list of proxies (default: http://localhost:8080)
 * Set RESERVE_PROXY_URL to comma-separated list of reserve proxies (optional)
 * Example:
 *   PROXY_URL="http://proxy1:8080,http://proxy2:8080,http://proxy3:8080"
 *   RESERVE_PROXY_URL="http://backup1:8080,http://backup2:8080"
 */

import http from 'node:http';

const PORT = process.env.PORT || 3000;
const ALL_PROXIES = (process.env.PROXY_URL || 'http://localhost:8080')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

// Reserve proxies - always at the end of queue, for emergency use only
const RESERVE_PROXIES = (process.env.RESERVE_PROXY_URL || '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

// All proxies combined (regular + reserve)
const COMBINED_PROXIES = [...ALL_PROXIES, ...RESERVE_PROXIES];

// Rate limit status codes that trigger failover
const RATE_LIMIT_CODES = [429, 500, 503];

// Global proxy queue - shared across all requests
// Failed proxies move to the end of this queue
// Reserve proxies always stay at the end
let proxyQueue = [...COMBINED_PROXIES];
let queueVersion = 0; // Increments on every queue modification
const queueLock = {locked: false, queue: []};

// Proxy statistics
const proxyStats = new Map();
for (const proxyUrl of COMBINED_PROXIES) {
    proxyStats.set(proxyUrl, {
        lastSuccess: null,
        lastError: null,
        isReserve: RESERVE_PROXIES.includes(proxyUrl),
        usageCount: 0, // Track usage for reserve proxies
    });
}

// Global health status
let allProxiesWorking = true;
let lastChecked = null;

console.log(`Configured proxy servers: ${ALL_PROXIES.length} regular + ${RESERVE_PROXIES.length} reserve`);

/**
 * Safely decode target URL from base64 for logging
 */
function decodeTargetUrl(targetUrl) {
    if (!targetUrl) return targetUrl;

    try {
        // Try to decode from base64
        const decoded = Buffer.from(targetUrl, 'base64').toString('utf-8');
        // Check if decoded string looks like a valid URL
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            return decoded;
        }
        return targetUrl;
    } catch {
        // Fallback to original if decode fails
        return targetUrl;
    }
}

/**
 * Simple mutex lock for queue modifications
 */
async function withLock(fn) {
    if (queueLock.locked) {
        return new Promise((resolve, reject) => {
            queueLock.queue.push(async () => {
                try {
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    queueLock.locked = true;
    try {
        return await fn();
    } finally {
        queueLock.locked = false;
        const next = queueLock.queue.shift();
        if (next) {
            next();
        }
    }
}

/**
 * Move failed proxy to the end of global queue
 * Only applies if queue version hasn't changed (prevents race conditions)
 * Regular proxies move to end before reserve zone
 * Reserve proxies move to end of reserve zone
 */
async function moveProxyToEnd(proxyUrl, snapshotVersion) {
    await withLock(async () => {
        // Check if queue was modified by another request
        if (queueVersion !== snapshotVersion) {
            console.log(`  ⚠️  Queue version changed (${snapshotVersion} -> ${queueVersion}), skipping reorder for ${proxyUrl}`);
            return;
        }

        const index = proxyQueue.indexOf(proxyUrl);
        if (index === -1) return;

        const stats = proxyStats.get(proxyUrl);
        const isReserve = stats?.isReserve || false;

        if (isReserve) {
            // Reserve proxy: move to end of reserve zone
            const lastReserveIndex = proxyQueue.length - 1;
            if (index !== lastReserveIndex) {
                proxyQueue.splice(index, 1);
                proxyQueue.push(proxyUrl);
                queueVersion++;
                console.log(`  🔽 Moved RESERVE ${proxyUrl} to end of reserve zone (version ${queueVersion})`);
            }
        } else {
            // Regular proxy: move to end before reserve zone
            const firstReserveIndex = proxyQueue.findIndex(url => {
                const s = proxyStats.get(url);
                return s?.isReserve;
            });

            const targetIndex = firstReserveIndex === -1 ? proxyQueue.length : firstReserveIndex;

            if (index !== targetIndex - 1) {
                proxyQueue.splice(index, 1);
                proxyQueue.splice(targetIndex - 1, 0, proxyUrl);
                queueVersion++;
                console.log(`  🔽 Moved ${proxyUrl} to end of regular zone (version ${queueVersion})`);
            }
        }
    });
}

/**
 * Mark proxy success
 */
function markProxySuccess(proxyUrl) {
    const stats = proxyStats.get(proxyUrl);
    if (stats) {
        stats.lastSuccess = new Date().toISOString();
        // Track usage count for all proxies
        stats.usageCount++;

        if (stats.isReserve) {
            console.log(`  📊 Reserve proxy ${proxyUrl} used ${stats.usageCount} times`);
        }
    }
    allProxiesWorking = true;
    lastChecked = new Date().toISOString();
}

/**
 * Mark proxy error
 */
function markProxyError(proxyUrl) {
    const stats = proxyStats.get(proxyUrl);
    if (stats) {
        stats.lastError = new Date().toISOString();
    }
    lastChecked = new Date().toISOString();
}

/**
 * Mark all proxies failed
 */
function markAllProxiesFailed() {
    allProxiesWorking = false;
    lastChecked = new Date().toISOString();
}

/**
 * Get a snapshot of current proxy queue and its version
 */
async function getProxySnapshot() {
    return withLock(async () => {
        return {
            proxies: [...proxyQueue],
            version: queueVersion,
        };
    });
}

/**
 * Get current queue status
 */
async function getQueueStatus() {
    return withLock(async () => {
        return proxyQueue.map((url, index) => {
            const stats = proxyStats.get(url);

            return {
                position: index + 1,
                url,
                isReserve: stats?.isReserve || false,
                lastSuccess: stats?.lastSuccess || null,
                lastError: stats?.lastError || null,
                usageCount: stats?.usageCount || 0,
            };
        });
    });
}

const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
        });
        res.end();
        return;
    }

    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
        const status = await getQueueStatus();
        const snapshot = await getProxySnapshot();

        // Separate regular and reserve proxies
        const regularProxies = status.filter(p => !p.isReserve);
        const reserveProxies = status.filter(p => p.isReserve);

        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        });
        res.end(
            JSON.stringify({
                status: 'ok',
                allProxiesWorking,
                lastChecked,
                queueVersion: snapshot.version,
                regular: {
                    total: ALL_PROXIES.length,
                    proxies: regularProxies,
                },
                reserve: {
                    total: RESERVE_PROXIES.length,
                    proxies: reserveProxies,
                },
            }, null, 2)
        );
        return;
    }

    const targetUrl = req.headers['x-target'];
    const decodedUrl = decodeTargetUrl(targetUrl);
    console.log('Streaming request:', req.method, 'to', decodedUrl);

    try {
        const proxyHeaders = {};

        // Copy all headers
        for (const [key, value] of Object.entries(req.headers)) {
            proxyHeaders[key] = value;
        }

        // Collect request body
        const buffers = [];
        for await (const chunk of req) {
            buffers.push(chunk);
        }
        const requestBody = Buffer.concat(buffers);

        const requestOptions = {
            method: req.method,
            headers: proxyHeaders,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && requestBody.length > 0) {
            requestOptions.body = requestBody;
        }

        let response = null;
        let lastError = null;
        let usedProxyUrl = null;

        // Get a snapshot of current global proxy queue with its version
        // This request works with this snapshot and version
        const snapshot = await getProxySnapshot();
        const proxyList = snapshot.proxies;
        const snapshotVersion = snapshot.version;

        console.log(`  Request proxy snapshot: ${proxyList.length} proxies (version ${snapshotVersion})`);

        // Try each proxy from the snapshot
        // Failed proxies are moved to end of GLOBAL queue (if version hasn't changed)
        for (const proxyUrl of proxyList) {
            try {
                console.log(`  Trying proxy: ${proxyUrl}`);
                response = await fetch(proxyUrl, requestOptions);

                // Check if we got rate limited
                if (RATE_LIMIT_CODES.includes(response.status)) {
                    console.log(`  Rate limited (${response.status}) on ${proxyUrl}`);
                    lastError = new Error(`Rate limited: ${response.status}`);

                    // Mark error and move to end of GLOBAL queue (with version check)
                    markProxyError(proxyUrl);
                    await moveProxyToEnd(proxyUrl, snapshotVersion);
                    continue;
                }

                // Success! Use this response
                usedProxyUrl = proxyUrl;
                console.log(`  ✓ Success via ${proxyUrl}`);
                markProxySuccess(proxyUrl);
                break;
            } catch (error) {
                console.log(`  Error with ${proxyUrl}:`, error.message);
                lastError = error;

                // Mark error and move to end of GLOBAL queue (with version check)
                markProxyError(proxyUrl);
                await moveProxyToEnd(proxyUrl, snapshotVersion);
            }
        }

        // If all proxies failed, return error
        if (!response || !usedProxyUrl) {
            markAllProxiesFailed();
            throw lastError || new Error('All proxy servers failed');
        }

        // Set response headers immediately
        const responseHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        // Copy headers from proxy response, but skip encoding headers
        // because fetch automatically decodes the response body
        const skipHeaders = ['content-encoding', 'content-length', 'transfer-encoding'];

        for (const [key, value] of response.headers) {
            if (!skipHeaders.includes(key.toLowerCase())) {
                responseHeaders[key] = value;
            }
        }

        res.writeHead(response.status, responseHeaders);

        // Stream response directly
        if (response.body) {
            const reader = response.body.getReader();

            try {
                while (true) {
                    const {done, value} = await reader.read();

                    if (done) {
                        break;
                    }

                    // Write chunk directly without any transformation
                    res.write(value);
                }
            } catch (streamError) {
                console.error('Stream error:', streamError);
            } finally {
                reader.releaseLock();
            }
        }

        res.end();
    } catch (error) {
        console.error('Proxy error:', error);

        res.writeHead(500, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        });
        res.end(`Proxy Error: ${error.message}`);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(
        `✓ Intermediate Proxy Server (Streaming + Versioned Queue + Reserve) running on http://0.0.0.0:${PORT}`
    );
    console.log(`  Regular proxies: ${ALL_PROXIES.length} (${ALL_PROXIES.join(', ')})`);
    if (RESERVE_PROXIES.length > 0) {
        console.log(`  Reserve proxies: ${RESERVE_PROXIES.length} (${RESERVE_PROXIES.join(', ')})`);
    }
    console.log(`  Queue versioning: only first concurrent request can modify order`);
    console.log(`  Reserve proxies stay at end of queue for emergency use`);
    console.log(`  Rate limit codes: ${RATE_LIMIT_CODES.join(', ')}`);
    console.log(`  Health check: GET http://0.0.0.0:${PORT}/health`);
    console.log(`  Environment: Node.js ${process.version}`);
});