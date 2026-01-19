/**
 * ============================================================
 *  HEALTH CHECK ENDPOINT
 * ============================================================
 */

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.json({
        status: 'ok',
        service: 'hls-stream-extractor',
        version: '2.0.0',
        timestamp: new Date().toISOString()
    });
};
