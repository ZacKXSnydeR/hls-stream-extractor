/**
 * HLS Stream Proxy
 * Proxies m3u8 content with proper headers to enable browser playback
 */

const https = require('https');
const http = require('http');

function proxyStream(targetUrl, headers) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(targetUrl);
        const protocol = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: {
                'User-Agent': headers['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': headers['Referer'] || '',
                'Origin': headers['Origin'] || '',
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        };

        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        req.end();
    });
}

module.exports = { proxyStream };
