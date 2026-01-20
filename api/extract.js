/**
 * HLS Stream Extractor API
 * 
 * Extracts M3U8/HLS streaming URLs from web pages using headless browser.
 * Runs on Docker with full Puppeteer support.
 */

const puppeteer = require('puppeteer');
const { browserPool } = require('./browserPool');
const { resultCache } = require('./cache');

// -----------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------
const CONFIG = {
    NAVIGATION_TIMEOUT: 15000,      // Reduced from 20s
    INITIAL_WAIT: 2000,             // Wait after page load
    STREAM_DETECTION_WINDOW: 10000, // Max time to wait for streams
    MAX_CLICK_ATTEMPTS: 6,          // Reduced from 8
    CLICK_DELAY: 800,               // Reduced from 2000ms
    EARLY_EXIT_DELAY: 1000,         // Wait after finding master playlist
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
// SUBTITLE DETECTION PATTERNS
// -----------------------------------------------------------------
const SUBTITLE_PATTERNS = [
    /\.vtt(\?|$)/i,
    /\.srt(\?|$)/i,
    /\.ass(\?|$)/i,
    /\.ssa(\?|$)/i,
    /subtitle.*\.vtt/i,
    /caption.*\.vtt/i,
    /\/vtt\//i,
    /\/subtitles\//i,
    /\/captions\//i
];

const SUBTITLE_LANGUAGE_MAP = {
    'en': 'English',
    'eng': 'English',
    'english': 'English',
    'bn': 'Bengali',
    'bangla': 'Bengali',
    'bengali': 'Bengali',
    'hi': 'Hindi',
    'hindi': 'Hindi',
    'ar': 'Arabic',
    'arabic': 'Arabic',
    'es': 'Spanish',
    'spanish': 'Spanish',
    'fr': 'French',
    'french': 'French',
    'de': 'German',
    'german': 'German',
    'zh': 'Chinese',
    'chinese': 'Chinese',
    'ja': 'Japanese',
    'japanese': 'Japanese',
    'ko': 'Korean',
    'korean': 'Korean',
    'pt': 'Portuguese',
    'portuguese': 'Portuguese',
    'ru': 'Russian',
    'russian': 'Russian',
    'it': 'Italian',
    'italian': 'Italian',
    'tr': 'Turkish',
    'turkish': 'Turkish'
};

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
const looksLikeSubtitle = (url) => SUBTITLE_PATTERNS.some(p => p.test(url));

function getStreamPriority(url) {
    let score = 0;
    if (url.includes('.m3u8')) score += 10;
    if (url.includes('master')) score += 5;
    if (url.includes('index')) score += 4;
    if (url.includes('manifest')) score += 3;
    if (/segment|chunk|\.ts\?/.test(url)) score -= 5;
    return score;
}

function extractLanguageFromUrl(url) {
    // Try to extract language code from URL
    const urlLower = url.toLowerCase();

    // Check for language codes in URL path or query params
    for (const [code, language] of Object.entries(SUBTITLE_LANGUAGE_MAP)) {
        if (urlLower.includes(`/${code}/`) ||
            urlLower.includes(`/${code}.`) ||
            urlLower.includes(`_${code}.`) ||
            urlLower.includes(`-${code}.`) ||
            urlLower.includes(`=${code}&`) ||
            urlLower.includes(`lang=${code}`) ||
            urlLower.includes(`language=${code}`)) {
            return language;
        }
    }

    return 'Unknown';
}

function isValidSubtitle(url) {
    // Filter out garbage URLs
    const urlLower = url.toLowerCase();

    // Must have proper extension
    if (!/\.(vtt|srt|ass|ssa)(\?|$)/i.test(url)) return false;

    // Reject if looks like ad/tracker
    if (urlLower.includes('analytics') ||
        urlLower.includes('tracking') ||
        urlLower.includes('pixel') ||
        urlLower.includes('beacon')) {
        return false;
    }

    // Reject tiny URLs (likely garbage)
    if (url.length < 20) return false;

    return true;
}

// -----------------------------------------------------------------
// MAIN EXTRACTION WITH CACHING AND TIMEOUT
// -----------------------------------------------------------------
async function extractStreams(targetUrl, userAgent, viewport) {
    // Check cache first
    const cached = resultCache.get(targetUrl);
    if (cached) {
        console.log('[CACHE] Returning cached result');
        return cached;
    }

    // Extract with timeout
    const result = await Promise.race([
        extractStreamsInternal(targetUrl, userAgent, viewport),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Extraction timeout')), 50000) // Reduced from 60s
        )
    ]);

    // Cache successful results
    if (result.success) {
        resultCache.set(targetUrl, result);
    }

    return result;
}

async function extractStreamsInternal(targetUrl, userAgent, viewport) {
    let browser = null;
    let isPoolBrowser = false;
    const capturedStreams = new Map();
    const capturedSubtitles = new Map();
    let bestStream = null;
    let foundMasterPlaylist = false;

    try {
        console.log('[INIT] Acquiring browser from pool');
        const startTime = Date.now();

        // Get browser from pool (much faster than launching new one)
        browser = await browserPool.acquire();
        isPoolBrowser = browserPool.browsers.includes(browser);

        console.log(`[INIT] Browser ready in ${Date.now() - startTime}ms`);

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
                    priority: getStreamPriority(url)
                };

                capturedStreams.set(url, streamData);
                console.log(`[STREAM] ${url.substring(0, 100)}`);

                if (!bestStream || streamData.priority > bestStream.priority) {
                    bestStream = streamData;
                }
            }

            // Capture subtitles
            if (looksLikeSubtitle(url) && isValidSubtitle(url)) {
                const language = extractLanguageFromUrl(url);
                const subtitleData = {
                    url: url,
                    language: language
                };

                capturedSubtitles.set(url, subtitleData);
                console.log(`[SUBTITLE] ${language}: ${url.substring(0, 80)}`);
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

        // Reduced initial wait
        await wait(CONFIG.INITIAL_WAIT);

        // Smart sequential clicking - balanced for speed + reliability
        let attempts = 0;
        const start = Date.now();
        const detectionWindow = CONFIG.STREAM_DETECTION_WINDOW;

        while (attempts < CONFIG.MAX_CLICK_ATTEMPTS && (Date.now() - start) < detectionWindow && !foundMasterPlaylist) {
            try {
                // Sequential clicking - find first visible element only
                let clicked = false;

                for (const selector of PLAY_SELECTORS) {
                    try {
                        const el = await page.$(selector);
                        if (el) {
                            const box = await el.boundingBox();
                            if (box && box.width > 10 && box.height > 10) {
                                // Use element.click() instead of mouse.click() - more reliable
                                await el.click();
                                clicked = true;
                                console.log(`[CLICK] ${selector}`);
                                await wait(400); // Brief pause after click
                                break; // Only click first found element
                            }
                        }
                    } catch (e) {
                        // Element might be detached, continue to next
                    }
                }

                // Gentle fallback: center click if no button found
                if (!clicked) {
                    await page.mouse.click(viewport.width / 2, viewport.height / 2);
                    await wait(300);
                }

                // Check for master playlist after each attempt
                if (capturedStreams.size > 0) {
                    const streams = Array.from(capturedStreams.values());
                    const master = streams.find(s => isMasterPlaylist(s.url));

                    if (master) {
                        console.log('[EARLY EXIT] Master playlist found');
                        foundMasterPlaylist = true;
                        bestStream = master;
                        await wait(CONFIG.EARLY_EXIT_DELAY);
                        break;
                    }
                }

                attempts++;
                await wait(CONFIG.CLICK_DELAY);

            } catch (error) {
                console.log(`[CLICK ERROR] ${error.message}`);
                await wait(500); // Wait before retry on error
            }
        }

        // Final wait for any remaining streams
        await wait(1500);

        // Results
        const allStreams = Array.from(capturedStreams.values())
            .sort((a, b) => b.priority - a.priority);

        const allSubtitles = Array.from(capturedSubtitles.values());

        if (allStreams.length > 0) {
            bestStream = allStreams[0];
            return {
                success: true,
                stream_url: bestStream.url,
                headers: bestStream.headers,
                subtitles: allSubtitles,
                all_streams: allStreams.map(s => ({ url: s.url, priority: s.priority }))
            };
        }

        return { success: false, error: 'No streams found' };

    } catch (error) {
        console.error('[ERROR]', error.message);
        return { success: false, error: error.message };
    } finally {
        // Cleanup: return browser to pool or close if temporary
        if (browser) {
            try {
                // Close all pages except the default one
                const pages = await browser.pages();
                for (let i = 1; i < pages.length; i++) {
                    await pages[i].close().catch(() => { });
                }

                // Return to pool or close
                if (isPoolBrowser) {
                    console.log('[POOL] Returning browser to pool');
                    browserPool.release(browser, false);
                } else {
                    console.log('[POOL] Closing temporary browser');
                    await browser.close().catch(() => { });
                }
            } catch (e) {
                console.error('[CLEANUP ERROR]', e.message);
                // If cleanup fails, try to close anyway
                browser.close().catch(() => { });
            }
        }
    }
}

// -----------------------------------------------------------------
// EXPORT FOR SERVER
// -----------------------------------------------------------------
module.exports = { extractStreams, pick, wait, USER_AGENTS, VIEWPORTS, CONFIG };
