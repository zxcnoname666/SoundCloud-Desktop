/**
 * Intermediate Proxy Server with Streaming and Failover
 *
 * Forwards requests to multiple proxy servers with automatic failover
 * Client -> This Proxy -> Main Proxy (with rotation) -> Target URL
 *
 * Usage: node intermediate-proxy.js
 * Default port: 3000
 * Set PROXY_URL to comma-separated list of proxies (default: http://localhost:8080)
 * Example: PROXY_URL="http://proxy1:8080,http://proxy2:8080,http://proxy3:8080"
 */

import http from 'node:http';

const PORT = process.env.PORT || 3000;
const ALL_PROXIES = (process.env.PROXY_URL || 'http://localhost:8080')
  .split(',')
  .map((url) => url.trim())
  .filter((url) => url.length > 0);

// Active proxies - starts as copy of all, gets reduced when proxies fail
let activeProxies = [...ALL_PROXIES];

// Rate limit status codes that trigger failover
const RATE_LIMIT_CODES = [429, 500, 503];

console.log(`Configured proxy servers: ${ALL_PROXIES.join(', ')}`);

/**
 * Remove a proxy from active list
 */
function removeFromActiveProxies(proxyUrl) {
  const index = activeProxies.indexOf(proxyUrl);
  if (index !== -1) {
    activeProxies.splice(index, 1);
    console.log(`  ❌ Removed ${proxyUrl} from active list. Remaining: ${activeProxies.length}`);
  }
}

/**
 * Restore all proxies when all fail
 */
function restoreAllProxies() {
  activeProxies = [...ALL_PROXIES];
  console.log(`  🔄 All proxies exhausted. Restored ${activeProxies.length} proxies`);
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

  const targetUrl = req.headers['x-target'];
  console.log('Streaming request:', req.method, 'to', targetUrl);

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

    // Try each proxy until one succeeds or we run out
    for (const proxyUrl of activeProxies) {
      try {
        console.log(`  Trying proxy: ${proxyUrl}`);
        response = await fetch(proxyUrl, requestOptions);

        // Check if we got rate limited
        if (RATE_LIMIT_CODES.includes(response.status)) {
          console.log(`  Rate limited (${response.status}) on ${proxyUrl}, removing...`);
          lastError = new Error(`Rate limited: ${response.status}`);

          // Remove failed proxy from active list
          removeFromActiveProxies(proxyUrl);

          // If all proxies exhausted, restore them
          if (activeProxies.length === 0) {
            restoreAllProxies();
          }

          continue;
        }

        // Success! Use this response
        usedProxyUrl = proxyUrl;
        console.log(`  ✓ Success via ${proxyUrl}`);
        break;
      } catch (error) {
        console.log(`  Error with ${proxyUrl}:`, error.message);
        lastError = error;

        // Remove failed proxy from active list
        removeFromActiveProxies(proxyUrl);

        // If all proxies exhausted, restore them
        if (activeProxies.length === 0) {
          restoreAllProxies();
        }
      }
    }

    // If all proxies failed, return error
    if (!response || !usedProxyUrl) {
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
          const { done, value } = await reader.read();

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
    `✓ Intermediate Proxy Server (Streaming + Failover + Rotation) running on http://0.0.0.0:${PORT}`
  );
  console.log(`  Proxy pool (${ALL_PROXIES.length}): ${ALL_PROXIES.join(', ')}`);
  console.log(`  Active proxies: ${activeProxies.length}`);
  console.log(`  Rate limit codes trigger rotation: ${RATE_LIMIT_CODES.join(', ')}`);
  console.log(`  Environment: Node.js ${process.version}`);
});
