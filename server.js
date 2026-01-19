/**
 * ============================================================
 *  LOCAL DEVELOPMENT SERVER
 *  For testing before deployment
 * ============================================================
 */

const http = require('http');
const url = require('url');

const indexHandler = require('./api/index');
const healthHandler = require('./api/health');
const extractHandler = require('./api/extract');

const PORT = process.env.PORT || 3000;

// Mock response for Vercel-style handlers
function createMockResponse(res) {
    return {
        _headers: {},
        _statusCode: 200,

        setHeader(name, value) {
            this._headers[name] = value;
            return this;
        },

        status(code) {
            this._statusCode = code;
            return this;
        },

        json(data) {
            res.writeHead(this._statusCode, {
                'Content-Type': 'application/json',
                ...this._headers
            });
            res.end(JSON.stringify(data, null, 2));
        },

        end(data) {
            res.writeHead(this._statusCode, this._headers);
            res.end(data);
        }
    };
}

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    req.query = parsedUrl.query;
    const mockRes = createMockResponse(res);

    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    try {
        if (pathname === '/' || pathname === '/api' || pathname === '/api/') {
            await indexHandler(req, mockRes);
        } else if (pathname === '/api/health' || pathname === '/health') {
            await healthHandler(req, mockRes);
        } else if (pathname === '/api/extract' || pathname === '/extract') {
            await extractHandler(req, mockRes);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    } catch (error) {
        console.error('Error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error', details: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║       🚀 HLS STREAM EXTRACTOR - LOCAL SERVER                  ║
╠════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                    ║
║                                                                ║
║  Endpoints:                                                    ║
║    GET  http://localhost:${PORT}/                                 ║
║    GET  http://localhost:${PORT}/api/health                       ║
║    GET  http://localhost:${PORT}/api/extract?url=...              ║
║                                                                ║
║  Deploy: vercel --prod                                         ║
╚════════════════════════════════════════════════════════════════╝
    `);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
});
