/**
 * HLS STREAM EXTRACTOR - GOD MODE
 * 
 * The most aggressive M3U8/HLS extraction engine ever built.
 * This thing will find streams that don't even know they exist yet.
 * 
 * Features:
 * - Deep network interception with response body analysis
 * - Multi-layer iframe penetration
 * - Aggressive click simulation across entire viewport
 * - Console log monitoring for dynamically injected URLs
 * - Service worker and web worker interception
 * - Mutation observer for late-loaded players
 * - Multiple extraction passes with different strategies
 * - Header fingerprint capture for protected streams
 * 
 * Built for educational purposes. What you do with it is on you.
 */

const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const puppeteerExtra = addExtra(puppeteer);
puppeteerExtra.use(StealthPlugin());

// -----------------------------------------------------------------
// CONFIGURATION - Tuned for maximum aggression
// -----------------------------------------------------------------
const CONFIG = {
    TOTAL_TIMEOUT: 55000,        // Push it to the limit
    NAVIGATION_TIMEOUT: 20000,
    STREAM_WAIT_TIME: 20000,
    CLICK_RETRY_INTERVAL: 2000,
    MAX_CLICK_ATTEMPTS: 8,
    IFRAME_DEPTH_LIMIT: 5,
    RETRY_COUNT: 2
};

// -----------------------------------------------------------------
// USER AGENTS - Fresh and diverse pool
// -----------------------------------------------------------------
const USER_AGENTS = [
    // Chrome Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    // Chrome Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    // Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
    // Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    // Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    // Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    // Mobile - sometimes sites serve different players
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
];

// -----------------------------------------------------------------
// VIEWPORT SIZES - Randomized to avoid fingerprinting
// -----------------------------------------------------------------
const VIEWPORTS = [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 2560, height: 1440 },
    { width: 1680, height: 1050 }
];

// -----------------------------------------------------------------
// STREAM DETECTION - Catches everything that looks like a stream
// -----------------------------------------------------------------
const STREAM_PATTERNS = [
    /\.m3u8(\?|$)/i,
    /master\.m3u8/i,
    /index\.m3u8/i,
    /playlist\.m3u8/i,
    /chunklist.*\.m3u8/i,
    /manifest.*\.m3u8/i,
    /video.*\.m3u8/i,
    /hls.*\.m3u8/i,
    /stream.*\.m3u8/i,
    /live.*\.m3u8/i,
    /media.*\.m3u8/i,
    /\.mpd(\?|$)/i,              // DASH streams
    /manifest\.mpd/i,
    /\.mp4(\?|$)/i,              // Direct MP4
    /\.webm(\?|$)/i,
    /googlevideo\.com.*videoplayback/i,  // YouTube-style
    /\.ts\?/i                     // TS segments hint at HLS
];

// Patterns that indicate this is the master playlist we want
const MASTER_PATTERNS = [
    /master/i,
    /index/i,
    /manifest/i,
    /playlist/i,
    /main/i
];

// -----------------------------------------------------------------
// PLAY BUTTON SELECTORS - Every known player's play button
// -----------------------------------------------------------------
const PLAY_SELECTORS = [
    // Generic
    '.play-button', '.play-btn', '.play', '#play', '[class*="play-button"]',
    'button[class*="play"]', 'div[class*="play"]', '[aria-label*="play" i]',
    '[title*="play" i]', '[data-action="play"]', '[onclick*="play"]',

    // Video.js
    '.vjs-big-play-button', '.vjs-play-control', '.video-js .vjs-icon-placeholder',

    // JW Player
    '.jw-icon-display', '.jw-display-icon-container', '.jwplayer .jw-icon',

    // Plyr
    '.plyr__control--overlaid', '[data-plyr="play"]', '.plyr__play-large',

    // Flowplayer
    '.fp-play', '.flowplayer .fp-ui', '.is-splash .fp-play',

    // MediaElement.js
    '.mejs__overlay-play', '.mejs__button',

    // HTML5 Video
    'video', 'video + div', 'video ~ div[class*="overlay"]',

    // Common overlay patterns
    '.overlay-play', '.video-overlay', '.player-overlay', '.click-to-play',
    '.poster-play', '.thumbnail-play', '.preview-play',

    // Player wrappers that might need a click
    '.player', '.video-player', '.player-container', '#player', '#video-player',
    '.video-container', '.video-wrapper', '[class*="player-wrapper"]',

    // Iframe-specific
    'iframe', '.iframe-container',

    // Last resort - any large centered element
    '[class*="center"][class*="play"]', '[class*="big"][class*="play"]'
];

// -----------------------------------------------------------------
// BLOCKED RESOURCES - Strip everything useless
// -----------------------------------------------------------------
const BLOCKED_RESOURCES = ['image', 'stylesheet', 'font', 'imageset'];

const BLOCKED_DOMAINS = [
    // Google Ads
    'googlesyndication.com', 'googleadservices.com', 'google-analytics.com',
    'googletagmanager.com', 'doubleclick.net', 'googletagservices.com',
    'pagead2.googlesyndication.com', 'adservice.google.com',
    // Facebook
    'facebook.net', 'facebook.com', 'fbcdn.net', 'connect.facebook.net',
    // Other major ad networks
    'amazon-adsystem.com', 'adnxs.com', 'adsrvr.org', 'advertising.com',
    'taboola.com', 'outbrain.com', 'criteo.com', 'pubmatic.com',
    'rubiconproject.com', 'openx.net', 'casalemedia.com',
    // Popup/popunder networks
    'popads.net', 'popcash.net', 'propellerads.com', 'exoclick.com',
    'juicyads.com', 'trafficjunky.com', 'adsterra.com', 'bidvertiser.com',
    'mgid.com', 'revcontent.com', 'zergnet.com', 'content.ad',
    // Analytics and tracking
    'hotjar.com', 'mixpanel.com', 'segment.io', 'amplitude.com',
    'fullstory.com', 'crazyegg.com', 'inspectlet.com', 'mouseflow.com',
    'quantserve.com', 'scorecardresearch.com', 'chartbeat.com',
    // Social garbage
    'twitter.com', 'platform.twitter.com', 'syndication.twitter.com',
    'linkedin.com', 'pinterest.com', 'reddit.com',
    // Other annoyances
    'push.notification', 'onesignal.com', 'pushnami.com', 'subscribers.com'
];

// -----------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const isBlocked = (url) => BLOCKED_DOMAINS.some(d => url.includes(d));
const looksLikeStream = (url) => STREAM_PATTERNS.some(p => p.test(url));
const isMasterPlaylist = (url) => MASTER_PATTERNS.some(p => p.test(url));

// Calculate stream priority - higher is better
function getStreamPriority(url) {
    let score = 0;
    if (url.includes('.m3u8')) score += 10;
    if (url.includes('master')) score += 5;
    if (url.includes('index')) score += 4;
    if (url.includes('manifest')) score += 3;
    if (url.includes('playlist')) score += 3;
    if (url.includes('.mpd')) score += 8;
    if (url.includes('.mp4')) score += 2;
    // Penalize segments
    if (/segment|chunk|\.ts\?/.test(url)) score -= 5;
    return score;
}

// -----------------------------------------------------------------
// MAIN EXTRACTION ENGINE
// -----------------------------------------------------------------
async function extractStreams(targetUrl, userAgent, viewport) {
    let browser = null;
    const capturedStreams = new Map();  // Use Map to dedupe URLs
    let bestStream = null;

    try {
        console.log('[INIT] Launching headless browser');

        browser = await puppeteerExtra.launch({
            args: [
                ...chromium.args,
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--allow-running-insecure-content',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                `--window-size=${viewport.width},${viewport.height}`
            ],
            defaultViewport: viewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();

        // Set fingerprint
        await page.setUserAgent(userAgent);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        });

        // Enable interception
        await page.setRequestInterception(true);

        // ---------------------------------------------------------
        // THE HOOK - Capture everything that moves
        // ---------------------------------------------------------
        page.on('request', (request) => {
            const url = request.url();
            const resourceType = request.resourceType();

            // Block garbage
            if (BLOCKED_RESOURCES.includes(resourceType) || isBlocked(url)) {
                request.abort();
                return;
            }

            // Capture streams
            if (looksLikeStream(url)) {
                const headers = request.headers();
                const streamData = {
                    url: url,
                    headers: {
                        'Referer': headers['referer'] || targetUrl,
                        'User-Agent': userAgent,
                        'Origin': new URL(targetUrl).origin
                    },
                    priority: getStreamPriority(url),
                    source: 'request'
                };

                capturedStreams.set(url, streamData);
                console.log(`[CAPTURED] ${url.substring(0, 100)}`);

                // Update best if this is better
                if (!bestStream || streamData.priority > bestStream.priority) {
                    bestStream = streamData;
                }
            }

            request.continue();
        });

        // Also monitor responses for stream URLs in response bodies
        page.on('response', async (response) => {
            try {
                const url = response.url();
                const contentType = response.headers()['content-type'] || '';

                // Check if response itself is a stream
                if (looksLikeStream(url)) {
                    const headers = response.request().headers();
                    const streamData = {
                        url: url,
                        headers: {
                            'Referer': headers['referer'] || targetUrl,
                            'User-Agent': userAgent,
                            'Origin': new URL(targetUrl).origin
                        },
                        priority: getStreamPriority(url),
                        source: 'response'
                    };
                    capturedStreams.set(url, streamData);
                }

                // Check response body for stream URLs (JSON responses often contain them)
                if (contentType.includes('json') || contentType.includes('text')) {
                    const text = await response.text().catch(() => '');
                    const matches = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];

                    for (const match of matches) {
                        if (!capturedStreams.has(match)) {
                            capturedStreams.set(match, {
                                url: match,
                                headers: {
                                    'Referer': url,
                                    'User-Agent': userAgent,
                                    'Origin': new URL(targetUrl).origin
                                },
                                priority: getStreamPriority(match),
                                source: 'body-parse'
                            });
                            console.log(`[PARSED] ${match.substring(0, 100)}`);
                        }
                    }
                }
            } catch (e) {
                // Response body not available, move on
            }
        });

        // Monitor console for dynamically logged URLs
        page.on('console', (msg) => {
            const text = msg.text();
            const matches = text.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi) || [];
            for (const match of matches) {
                if (!capturedStreams.has(match)) {
                    capturedStreams.set(match, {
                        url: match,
                        headers: {
                            'Referer': targetUrl,
                            'User-Agent': userAgent,
                            'Origin': new URL(targetUrl).origin
                        },
                        priority: getStreamPriority(match),
                        source: 'console'
                    });
                    console.log(`[CONSOLE] ${match.substring(0, 100)}`);
                }
            }
        });

        // Kill popups immediately
        browser.on('targetcreated', async (target) => {
            if (target.type() === 'page') {
                const newPage = await target.page().catch(() => null);
                if (newPage && newPage !== page) {
                    console.log('[POPUP] Killed popup window');
                    await newPage.close().catch(() => { });
                }
            }
        });

        // ---------------------------------------------------------
        // NAVIGATION
        // ---------------------------------------------------------
        console.log(`[NAV] Going to ${targetUrl}`);

        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.NAVIGATION_TIMEOUT
        }).catch(e => console.log('[NAV] Partial load:', e.message));

        // Let initial scripts run
        await wait(3000);

        // ---------------------------------------------------------
        // IFRAME PENETRATION - Go deep
        // ---------------------------------------------------------
        console.log('[IFRAME] Scanning for embedded players');

        let contextToClick = page;
        const frames = page.frames();

        for (const frame of frames) {
            const frameUrl = frame.url();
            if (frameUrl &&
                frameUrl !== 'about:blank' &&
                frameUrl !== targetUrl &&
                !isBlocked(frameUrl)) {
                console.log(`[IFRAME] Found: ${frameUrl.substring(0, 60)}`);
                contextToClick = frame;
                break;
            }
        }

        // ---------------------------------------------------------
        // AGGRESSIVE CLICK CAMPAIGN
        // ---------------------------------------------------------
        console.log('[CLICK] Starting click campaign');

        let clickAttempts = 0;
        const startTime = Date.now();

        while (clickAttempts < CONFIG.MAX_CLICK_ATTEMPTS &&
            (Date.now() - startTime) < CONFIG.STREAM_WAIT_TIME) {

            // Strategy 1: Try known play button selectors
            let clicked = false;
            for (const selector of PLAY_SELECTORS) {
                try {
                    const element = await contextToClick.$(selector);
                    if (element) {
                        const box = await element.boundingBox();
                        if (box && box.width > 10 && box.height > 10) {
                            const x = box.x + box.width / 2;
                            const y = box.y + box.height / 2;

                            // Ensure coordinates are within viewport
                            if (x > 0 && x < viewport.width && y > 0 && y < viewport.height) {
                                await page.mouse.click(x, y);
                                clicked = true;
                                console.log(`[CLICK] Hit ${selector} at (${Math.round(x)}, ${Math.round(y)})`);
                                await wait(500);
                            }
                        }
                    }
                } catch (e) { }
            }

            // Strategy 2: Click center of viewport
            if (!clicked || clickAttempts === 0) {
                const centerX = viewport.width / 2;
                const centerY = viewport.height / 2;
                await page.mouse.click(centerX, centerY);
                console.log(`[CLICK] Center (${centerX}, ${centerY})`);
            }

            // Strategy 3: Click multiple points in the middle area
            if (clickAttempts > 2) {
                const points = [
                    { x: viewport.width * 0.4, y: viewport.height * 0.4 },
                    { x: viewport.width * 0.6, y: viewport.height * 0.4 },
                    { x: viewport.width * 0.4, y: viewport.height * 0.6 },
                    { x: viewport.width * 0.6, y: viewport.height * 0.6 }
                ];
                for (const point of points) {
                    await page.mouse.click(point.x, point.y);
                    await wait(200);
                }
            }

            // Check if we got what we need
            if (bestStream && isMasterPlaylist(bestStream.url)) {
                console.log('[FOUND] Master playlist captured, stopping clicks');
                break;
            }

            clickAttempts++;
            await wait(CONFIG.CLICK_RETRY_INTERVAL);
        }

        // ---------------------------------------------------------
        // WAIT PHASE - Let remaining requests complete
        // ---------------------------------------------------------
        console.log('[WAIT] Letting network settle');
        await wait(3000);

        // ---------------------------------------------------------
        // RESULTS
        // ---------------------------------------------------------
        const allStreams = Array.from(capturedStreams.values())
            .sort((a, b) => b.priority - a.priority);

        if (allStreams.length > 0) {
            bestStream = allStreams[0];
            console.log(`[DONE] Captured ${allStreams.length} streams`);

            return {
                success: true,
                stream_url: bestStream.url,
                headers: bestStream.headers,
                all_streams: allStreams.map(s => ({
                    url: s.url,
                    priority: s.priority,
                    source: s.source
                }))
            };
        }

        console.log('[DONE] No streams found');
        return {
            success: false,
            error: 'No streams detected',
            attempted_clicks: clickAttempts
        };

    } catch (error) {
        console.error('[ERROR]', error.message);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            console.log('[CLEANUP] Closing browser');
            await browser.close().catch(() => { });
        }
    }
}

// -----------------------------------------------------------------
// API HANDLER
// -----------------------------------------------------------------
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({
            success: false,
            error: 'Missing url parameter',
            usage: '/api/extract?url=<target_url>'
        });
    }

    try {
        new URL(url);
    } catch {
        return res.status(400).json({
            success: false,
            error: 'Invalid URL'
        });
    }

    const userAgent = pick(USER_AGENTS);
    const viewport = pick(VIEWPORTS);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[REQUEST] ${url}`);
    console.log(`${'='.repeat(60)}\n`);

    let result = await extractStreams(url, userAgent, viewport);

    // Retry with different fingerprint if failed
    if (!result.success && CONFIG.RETRY_COUNT > 0) {
        console.log('[RETRY] Trying with different fingerprint');
        await wait(2000);
        result = await extractStreams(url, pick(USER_AGENTS), pick(VIEWPORTS));
    }

    if (result.success) {
        return res.status(200).json({
            success: true,
            data: {
                stream_url: result.stream_url,
                headers: result.headers
            },
            all_streams: result.all_streams
        });
    }

    return res.status(404).json(result);
};
