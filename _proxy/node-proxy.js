/**
 * Node.js HTTP Proxy Server for SoundCloud Desktop
 *
 * This server acts as a proxy that receives the target URL in the X-Target header
 * and forwards the request to that URL, handling redirects properly.
 *
 * Compatible with Node.js 18+ (requires built-in fetch and Web Crypto API)
 *
 * Usage: node node-proxy.js
 * Default port: 8080 (configurable via PORT environment variable)
 */

import http from 'node:http';
import https from 'node:https';

const PORT = process.env.PORT || 8080;

const httpsAgent = new https.Agent({
  maxVersion: 'TLSv1.2',
  minVersion: 'TLSv1',
});

const server = http.createServer(async (req, res) => {
  // Collect request body
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const requestBody = Buffer.concat(buffers);

  // Build request headers object
  const requestHeaders = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      requestHeaders.set(key, value.join(', '));
    } else if (value) {
      requestHeaders.set(key, value);
    }
  }

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
  const encodedUrl = requestHeaders.get('X-Target');

  if (!encodedUrl) {
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
  let targetUrl;
  try {
    targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
  } catch (error) {
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
    const targetHeaders = new Headers();

    // Copy all headers except proxy-specific ones
    for (const [key, value] of requestHeaders) {
      if (
        key.toLowerCase() !== 'x-target' &&
        key.toLowerCase() !== 'x-proxy-secret' &&
        key.toLowerCase() !== 'host' &&
        key.toLowerCase() !== 'x-forwarded-for' &&
        key.toLowerCase() !== 'x-forwarded-proto' &&
        key.toLowerCase() !== 'x-real-ip' &&
        key.toLowerCase() !== 'connection'
      ) {
        targetHeaders.set(key, value);
      }
    }

    // Set proper host header for target
    const targetUrlObj = new URL(targetUrl);
    targetHeaders.set('Host', targetUrlObj.host);

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
    const response = await fetch(targetUrl, {
      ...requestOptions,
      agent: targetUrlObj.protocol === 'https:' ? httpsAgent : undefined,
    });

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

        // Build response headers
        const responseHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        };

        // Copy headers from original response
        for (const [key, value] of response.headers) {
          responseHeaders[key] = value;
        }

        // Update Location header
        responseHeaders['Location'] = newLocation;

        // Send redirect response
        res.writeHead(response.status, responseHeaders);
        const redirectBody = await response.arrayBuffer();
        res.end(Buffer.from(redirectBody));
        return;
      }
    }

    const responseBody = await response.arrayBuffer();
    // Send response
    res.writeHead(response.status, responseHeaders);
    res.end(Buffer.from(responseBody));
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
  console.log(`✓ Node.js Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`  Environment: Node.js ${process.version}`);
});
