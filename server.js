/**
 * HLS Stream Extractor - Express Server
 * For Railway / Docker deployment
 */

const http = require('http');
const url = require('url');
const { extractStreams, pick, wait, USER_AGENTS, VIEWPORTS, CONFIG } = require('./api/extract');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Routes
    if (pathname === '/' || pathname === '/api' || pathname === '/api/') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'online',
            service: 'HLS Stream Extractor API',
            version: '2.0.0',
            description: 'Generic M3U8/HLS stream extraction using Puppeteer',
            endpoints: {
                extract: {
                    method: 'GET',
                    path: '/api/extract',
                    params: {
                        url: 'Target page URL (required)'
                    },
                    example: '/api/extract?url=https://example.com/video-page'
                },
                health: {
                    method: 'GET',
                    path: '/api/health'
                }
            }
        }, null, 2));
        return;
    }

    if (pathname === '/api/health' || pathname === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            service: 'hls-stream-extractor',
            version: '2.0.0',
            timestamp: new Date().toISOString()
        }, null, 2));
        return;
    }

    if (pathname === '/api/extract' || pathname === '/extract') {
        const targetUrl = query.url;

        if (!targetUrl) {
            res.writeHead(400);
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
            res.writeHead(400);
            res.end(JSON.stringify({
                success: false,
                error: 'Invalid URL'
            }, null, 2));
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

        // Force garbage collection after extraction
        if (global.gc) {
            global.gc();
            console.log('[GC] Triggered garbage collection');
        }

        // Log memory usage
        const memUsage = process.memoryUsage();
        console.log(`[MEMORY] Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);

        if (result.success) {
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    stream_url: result.stream_url,
                    headers: result.headers,
                    subtitles: result.subtitles || []
                },
                all_streams: result.all_streams
            }, null, 2));
        } else {
            res.writeHead(404);
            res.end(JSON.stringify(result, null, 2));
        }
        return;
    }

    // 404 for unknown routes
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// Monitor memory usage every 30 seconds
setInterval(() => {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);

    console.log(`[HEALTH] Memory: ${heapUsedMB}MB / ${heapTotalMB}MB`);

    // More aggressive GC for low-RAM VPS
    if (global.gc && heapUsedMB > 200) { // Reduced from 400MB
        console.log('[HEALTH] High memory usage, triggering GC');
        global.gc();
    }
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`HLS Stream Extractor API running on port ${PORT}`);
    console.log(`GC available: ${!!global.gc}`);
});
