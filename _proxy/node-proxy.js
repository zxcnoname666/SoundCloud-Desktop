/**
 * Simple Proxy Server (Node.js port of Cloudflare Worker)
 *
 * Acts as a proxy that receives the target URL in the X-Target header
 * and forwards the request to that URL, handling redirects properly.
 *
 * Usage: node simple-proxy.js
 * Default port: 8080
 */

import http from 'node:http';

const PORT = process.env.PORT || 8080;

/**
 * Safely decode target URL from base64
 */
function decodeTargetUrl(urlHeader) {
    if (!urlHeader) return null;

    try {
        return Buffer.from(urlHeader, 'base64').toString('utf-8');
    } catch {
        return null;
    }
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

    // Get target URL from header (base64 encoded)
    const urlHeader = req.headers['x-target'];

    if (!urlHeader) {
        res.writeHead(400, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        });
        res.end('Missing X-Target header');
        return;
    }

    // Decode base64 URL
    const targetUrl = decodeTargetUrl(urlHeader);

    if (!targetUrl) {
        res.writeHead(400, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        });
        res.end('Invalid base64 encoded URL');
        return;
    }

    console.log('Proxying request:', req.method, 'to', targetUrl);

    try {
        // Prepare headers for the target request
        const targetHeaders = {};
        const targetUrlObj = new URL(targetUrl);

        // Copy all headers except proxy-specific ones
        const skipHeaders = [
            'x-target',
            'host',
            'cf-connecting-ip',
            'cf-ipcountry',
            'cf-ray',
            'cf-visitor',
            'x-forwarded-for',
            'x-forwarded-proto',
            'x-real-ip',
        ];

        for (const [key, value] of Object.entries(req.headers)) {
            if (!skipHeaders.includes(key.toLowerCase())) {
                targetHeaders[key] = value;
            }
        }

        // Set proper host header for target
        targetHeaders['host'] = targetUrlObj.host;

        // Collect request body
        const buffers = [];
        for await (const chunk of req) {
            buffers.push(chunk);
        }
        const requestBody = Buffer.concat(buffers);

        // Prepare request options
        const requestOptions = {
            method: req.method,
            headers: targetHeaders,
            redirect: 'manual', // Handle redirects manually
        };

        // Add body for non-GET requests
        if (req.method !== 'GET' && req.method !== 'HEAD' && requestBody.length > 0) {
            requestOptions.body = requestBody;
        }

        // Make request to target URL
        const response = await fetch(targetUrl, requestOptions);

        // Handle redirects by updating Location header to point to actual destination
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('Location');
            if (location) {
                let newLocation;

                // Handle relative redirects
                if (location.startsWith('/')) {
                    newLocation = new URL(location, targetUrl).href;
                }
                // Handle absolute redirects
                else if (location.startsWith('http')) {
                    newLocation = location;
                }
                // Handle protocol-relative redirects
                else if (location.startsWith('//')) {
                    newLocation = targetUrlObj.protocol + location;
                }
                // Handle relative path redirects
                else {
                    newLocation = new URL(location, targetUrl).href;
                }

                console.log('Redirect from', targetUrl, 'to', newLocation);

                // Create response headers with updated Location
                const responseHeaders = {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                };

                // Copy headers from response
                for (const [key, value] of response.headers) {
                    if (key.toLowerCase() !== 'location') {
                        responseHeaders[key] = value;
                    }
                }

                // Set updated Location header
                responseHeaders['Location'] = newLocation;

                res.writeHead(response.status, responseHeaders);

                // Stream response body if any
                if (response.body) {
                    const reader = response.body.getReader();
                    try {
                        while (true) {
                            const {done, value} = await reader.read();
                            if (done) break;
                            res.write(value);
                        }
                    } finally {
                        reader.releaseLock();
                    }
                }

                res.end();
                return;
            }
        }

        // For non-redirect responses, add CORS headers and return
        const responseHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        };

        // Copy headers from response, skip problematic ones
        const skipResponseHeaders = [
            'content-security-policy',
            'x-frame-options',
            'content-encoding',
            'content-length',
            'transfer-encoding',
        ];

        for (const [key, value] of response.headers) {
            if (!skipResponseHeaders.includes(key.toLowerCase())) {
                responseHeaders[key] = value;
            }
        }

        res.writeHead(response.status, responseHeaders);

        // Stream response body
        if (response.body) {
            const reader = response.body.getReader();
            try {
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
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

        res.writeHead(503, {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
        });
        res.end(`Proxy Error: ${error.message}`);
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Simple Proxy Server running on http://0.0.0.0:${PORT}`);
    console.log(`  X-Target header: base64 encoded URL`);
    console.log(`  Handles redirects automatically`);
    console.log(`  Environment: Node.js ${process.version}`);
});