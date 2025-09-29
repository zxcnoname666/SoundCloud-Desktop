/**
 * Cloudflare Worker Proxy for SoundCloud Desktop
 *
 * This worker acts as a proxy that receives the target URL in the X-Proxy-Target-URL header
 * and forwards the request to that URL, handling redirects properly.
 */

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Access-Control-Max-Age': '86400',
                },
            });
        }

        // Get target URL from header
        const targetUrl = request.headers.get('X-Proxy-Target-URL');

        if (!targetUrl) {
            return new Response('Missing X-Proxy-Target-URL header', {
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                },
            });
        }

        console.log('Proxying request:', request.method, 'to', targetUrl);

        try {
            // Prepare headers for the target request
            const targetHeaders = new Headers();

            // Copy all headers except proxy-specific ones
            for (const [key, value] of request.headers) {
                if (
                    key.toLowerCase() !== 'x-proxy-target-url' &&
                    key.toLowerCase() !== 'host' &&
                    key.toLowerCase() !== 'cf-connecting-ip' &&
                    key.toLowerCase() !== 'cf-ipcountry' &&
                    key.toLowerCase() !== 'cf-ray' &&
                    key.toLowerCase() !== 'cf-visitor' &&
                    key.toLowerCase() !== 'x-forwarded-for' &&
                    key.toLowerCase() !== 'x-forwarded-proto' &&
                    key.toLowerCase() !== 'x-real-ip'
                ) {
                    targetHeaders.set(key, value);
                }
            }

            // Set proper host header for target
            const targetUrlObj = new URL(targetUrl);
            targetHeaders.set('Host', targetUrlObj.host);

            // Add user agent if not present
            if (!targetHeaders.has('User-Agent')) {
                targetHeaders.set('User-Agent', 'SoundCloud-Desktop/1.0');
            }

            // Add proxy identifier
            targetHeaders.set('X-Proxied-By', 'SoundCloud-Desktop-Proxy');

            // Prepare request options
            const requestOptions = {
                method: request.method,
                headers: targetHeaders,
                redirect: 'manual', // Handle redirects manually
            };

            // Add body for non-GET requests
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                requestOptions.body = request.body;
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

                    // Create new response with updated Location header
                    // The Location should point to the actual destination, not back to proxy
                    const newHeaders = new Headers(response.headers);
                    newHeaders.set('Location', newLocation);

                    // Add CORS headers
                    newHeaders.set('Access-Control-Allow-Origin', '*');
                    newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                    newHeaders.set('Access-Control-Allow-Headers', '*');

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                }
            }

            // For non-redirect responses, add CORS headers and return
            const responseHeaders = new Headers(response.headers);
            responseHeaders.set('Access-Control-Allow-Origin', '*');
            responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            responseHeaders.set('Access-Control-Allow-Headers', '*');

            // Remove potentially problematic headers
            responseHeaders.delete('content-security-policy');
            responseHeaders.delete('x-frame-options');

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
            });
        } catch (error) {
            console.error('Proxy error:', error);

            return new Response(`Proxy Error: ${error.message}`, {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                },
            });
        }
    },
};
