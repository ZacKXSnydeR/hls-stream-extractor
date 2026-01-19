/**
 * HLS Stream Extractor - Server with Web Player
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { extractStreams, pick, wait, USER_AGENTS, VIEWPORTS, CONFIG } = require('./api/extract');
const { proxyStream } = require('./api/proxy');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve web player
    if (pathname === '/' || pathname === '/player') {
        const htmlPath = path.join(__dirname, 'public', 'index.html');
        try {
            const html = fs.readFileSync(htmlPath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Player not found' }));
        }
        return;
    }

    // API Documentation
    if (pathname === '/api' || pathname === '/api/') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            service: 'HLS Stream Extractor API',
            version: '2.1.0',
            endpoints: {
                player: '/',
                extract: '/api/extract?url=<page_url>',
                proxy: '/api/proxy?url=<stream_url>',
                health: '/api/health'
            }
        }, null, 2));
        return;
    }

    // Health check
    if (pathname === '/api/health' || pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            service: 'hls-stream-extractor',
            version: '2.1.0',
            timestamp: new Date().toISOString()
        }, null, 2));
        return;
    }

    // Proxy endpoint
    if (pathname === '/api/proxy' || pathname === '/proxy') {
        const streamUrl = query.url;
        const referer = query.referer || '';
        const origin = query.origin || '';

        if (!streamUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        try {
            const result = await proxyStream(streamUrl, {
                'Referer': referer,
                'Origin': origin,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            });

            // Determine content type
            let contentType = result.headers['content-type'] || 'application/vnd.apple.mpegurl';

            // Set CORS and content headers
            res.writeHead(result.status, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            });
            res.end(result.body);
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Extract endpoint
    if (pathname === '/api/extract' || pathname === '/extract') {
        const targetUrl = query.url;

        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Missing url parameter',
                usage: '/api/extract?url=<target_url>'
            }, null, 2));
            return;
        }

        try {
            new URL(targetUrl);
        } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Invalid URL' }));
            return;
        }

        console.log(`[REQUEST] ${targetUrl}`);

        const userAgent = pick(USER_AGENTS);
        const viewport = pick(VIEWPORTS);

        let result = await extractStreams(targetUrl, userAgent, viewport);

        if (!result.success && CONFIG.RETRY_COUNT > 0) {
            console.log('[RETRY]');
            await wait(1000);
            result = await extractStreams(targetUrl, pick(USER_AGENTS), pick(VIEWPORTS));
        }

        res.writeHead(result.success ? 200 : 404, { 'Content-Type': 'application/json' });

        if (result.success) {
            res.end(JSON.stringify({
                success: true,
                data: {
                    stream_url: result.stream_url,
                    headers: result.headers
                },
                all_streams: result.all_streams
            }, null, 2));
        } else {
            res.end(JSON.stringify(result, null, 2));
        }
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`HLS Stream Extractor running on port ${PORT}`);
    console.log(`Web Player: http://localhost:${PORT}`);
});
