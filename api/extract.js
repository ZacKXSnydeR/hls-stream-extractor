/**
 * HLS Stream Extractor API
 * 
 * Extracts M3U8/HLS streaming URLs from web pages using headless browser.
 * Designed for Vercel serverless deployment.
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// -----------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------
const CONFIG = {
    TOTAL_TIMEOUT: 55000,
    NAVIGATION_TIMEOUT: 20000,
    STREAM_WAIT_TIME: 20000,
    MAX_CLICK_ATTEMPTS: 8,
    RETRY_COUNT: 1
};

// -----------------------------------------------------------------
// USER AGENTS
// -----------------------------------------------------------------
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
];

// -----------------------------------------------------------------
// VIEWPORT SIZES
// -----------------------------------------------------------------
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 }
];

// -----------------------------------------------------------------
// STREAM DETECTION PATTERNS
// -----------------------------------------------------------------
const STREAM_PATTERNS = [
    /\.m3u8(\?|$)/i,
    /master\.m3u8/i,
    /index\.m3u8/i,
    /playlist\.m3u8/i,
    /manifest.*\.m3u8/i,
    /video.*\.m3u8/i,
    /hls.*\.m3u8/i,
    /\.mpd(\?|$)/i,
    /\.mp4(\?|$)/i
];

const MASTER_PATTERNS = [/master/i, /index/i, /manifest/i, /playlist/i];

// -----------------------------------------------------------------
// PLAY BUTTON SELECTORS
// -----------------------------------------------------------------
const PLAY_SELECTORS = [
    '.play-button', '.play-btn', '.play', '#play',
    'button[class*="play"]', 'div[class*="play"]', '[aria-label*="play" i]',
    '.vjs-big-play-button', '.jw-icon-display',
    '.plyr__control--overlaid', '[data-plyr="play"]',
    'video', '.player', '#player'
];

// -----------------------------------------------------------------
// BLOCKED RESOURCES
// -----------------------------------------------------------------
const BLOCKED_RESOURCES = ['image', 'stylesheet', 'font', 'imageset'];

const BLOCKED_DOMAINS = [
    'googlesyndication.com', 'googleadservices.com', 'google-analytics.com',
    'doubleclick.net', 'facebook.net', 'amazon-adsystem.com',
    'popads.net', 'propellerads.com', 'hotjar.com'
];

// -----------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const isBlocked = (url) => BLOCKED_DOMAINS.some(d => url.includes(d));
const looksLikeStream = (url) => STREAM_PATTERNS.some(p => p.test(url));
const isMasterPlaylist = (url) => MASTER_PATTERNS.some(p => p.test(url));

function getStreamPriority(url) {
    let score = 0;
    if (url.includes('.m3u8')) score += 10;
    if (url.includes('master')) score += 5;
    if (url.includes('index')) score += 4;
    if (url.includes('manifest')) score += 3;
    if (/segment|chunk|\.ts\?/.test(url)) score -= 5;
    return score;
}

// -----------------------------------------------------------------
// MAIN EXTRACTION
// -----------------------------------------------------------------
async function extractStreams(targetUrl, userAgent, viewport) {
    let browser = null;
    const capturedStreams = new Map();
    let bestStream = null;

    try {
        console.log('[INIT] Launching browser');

        // Ensure fonts are loaded for headless rendering
        chromium.setHeadlessMode = true;
        chromium.setGraphicsMode = false;

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: viewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();
        await page.setUserAgent(userAgent);

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        });

        await page.setRequestInterception(true);

        // Network interception
        page.on('request', (request) => {
            const url = request.url();
            const resourceType = request.resourceType();

            if (BLOCKED_RESOURCES.includes(resourceType) || isBlocked(url)) {
                request.abort();
                return;
            }

            if (looksLikeStream(url)) {
                const headers = request.headers();
                const streamData = {
                    url: url,
                    headers: {
                        'Referer': headers['referer'] || targetUrl,
                        'User-Agent': userAgent,
                        'Origin': new URL(targetUrl).origin
                    },
                    priority: getStreamPriority(url)
                };

                capturedStreams.set(url, streamData);
                console.log(`[CAPTURED] ${url.substring(0, 100)}`);

                if (!bestStream || streamData.priority > bestStream.priority) {
                    bestStream = streamData;
                }
            }

            request.continue();
        });

        // Response body parsing for embedded URLs
        page.on('response', async (response) => {
            try {
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('json') || contentType.includes('javascript')) {
                    const text = await response.text().catch(() => '');
                    const matches = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];

                    for (const match of matches) {
                        if (!capturedStreams.has(match)) {
                            capturedStreams.set(match, {
                                url: match,
                                headers: {
                                    'Referer': response.url(),
                                    'User-Agent': userAgent,
                                    'Origin': new URL(targetUrl).origin
                                },
                                priority: getStreamPriority(match)
                            });
                        }
                    }
                }
            } catch (e) { }
        });

        // Kill popups
        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                const newPage = await target.page().catch(() => null);
                if (newPage && newPage !== page) {
                    await newPage.close().catch(() => { });
                }
            }
        });

        // Navigate
        console.log(`[NAV] ${targetUrl}`);
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.NAVIGATION_TIMEOUT
        }).catch(e => console.log('[NAV] Partial:', e.message));

        await wait(3000);

        // Click campaign
        let attempts = 0;
        const start = Date.now();

        while (attempts < CONFIG.MAX_CLICK_ATTEMPTS && (Date.now() - start) < CONFIG.STREAM_WAIT_TIME) {
            // Try play buttons
            for (const selector of PLAY_SELECTORS) {
                try {
                    const el = await page.$(selector);
                    if (el) {
                        const box = await el.boundingBox();
                        if (box && box.width > 10 && box.height > 10) {
                            await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                            await wait(500);
                        }
                    }
                } catch (e) { }
            }

            // Center click
            await page.mouse.click(viewport.width / 2, viewport.height / 2);

            if (bestStream && isMasterPlaylist(bestStream.url)) break;

            attempts++;
            await wait(2000);
        }

        await wait(2000);

        // Results
        const allStreams = Array.from(capturedStreams.values())
            .sort((a, b) => b.priority - a.priority);

        if (allStreams.length > 0) {
            bestStream = allStreams[0];
            return {
                success: true,
                stream_url: bestStream.url,
                headers: bestStream.headers,
                all_streams: allStreams.map(s => ({ url: s.url, priority: s.priority }))
            };
        }

        return { success: false, error: 'No streams found' };

    } catch (error) {
        console.error('[ERROR]', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
}

// -----------------------------------------------------------------
// API HANDLER
// -----------------------------------------------------------------
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Missing url parameter',
            usage: '/api/extract?url=<target_url>'
        });
    }

    try { new URL(url); } catch {
        return res.status(400).json({ success: false, error: 'Invalid URL' });
    }

    const userAgent = pick(USER_AGENTS);
    const viewport = pick(VIEWPORTS);

    console.log(`[REQUEST] ${url}`);

    let result = await extractStreams(url, userAgent, viewport);

    if (!result.success && CONFIG.RETRY_COUNT > 0) {
        console.log('[RETRY]');
        await wait(1000);
        result = await extractStreams(url, pick(USER_AGENTS), pick(VIEWPORTS));
    }

    if (result.success) {
        return res.status(200).json({
            success: true,
            data: { stream_url: result.stream_url, headers: result.headers },
            all_streams: result.all_streams
        });
    }

    return res.status(404).json(result);
};
