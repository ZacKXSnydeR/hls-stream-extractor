/**
 * ============================================================
 *  HLS STREAM EXTRACTOR API - INDEX
 *  Vercel Serverless Function
 * ============================================================
 */

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.json({
        status: 'online',
        service: 'HLS Stream Extractor API',
        version: '2.0.0',
        description: 'Generic M3U8/HLS stream extraction using Puppeteer',
        endpoints: {
            extract: {
                method: 'GET',
                path: '/api/extract',
                params: {
                    url: 'Target page URL (required)',
                    timeout: 'Extraction timeout in ms (optional, default: 30000)'
                },
                example: '/api/extract?url=https://example.com/video-page'
            },
            health: {
                method: 'GET',
                path: '/api/health'
            }
        },
        disclaimer: 'Educational purposes only. Users are responsible for their usage.'
    });
};
