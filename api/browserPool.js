/**
 * Browser Pool Manager
 * Maintains warm browser instances for faster extraction
 */

const puppeteer = require('puppeteer');

class BrowserPool {
    constructor(poolSize = 2) {
        this.poolSize = poolSize;
        this.browsers = [];
        this.available = [];
        this.initializing = false;
    }

    async initialize() {
        if (this.initializing) return;
        this.initializing = true;

        console.log('[POOL] Initializing browser pool...');

        for (let i = 0; i < this.poolSize; i++) {
            try {
                const browser = await this.createBrowser();
                this.browsers.push(browser);
                this.available.push(browser);
                console.log(`[POOL] Browser ${i + 1}/${this.poolSize} ready`);
            } catch (e) {
                console.error(`[POOL] Failed to create browser ${i + 1}:`, e.message);
            }
        }

        this.initializing = false;
        console.log(`[POOL] Pool initialized with ${this.available.length} browsers`);
    }

    async createBrowser() {
        return await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-blink-features=AutomationControlled'
            ],
            ignoreHTTPSErrors: true
        });
    }

    async acquire() {
        // Ensure pool is initialized
        if (this.browsers.length === 0 && !this.initializing) {
            await this.initialize();
        }

        // Wait for initialization if in progress
        while (this.initializing) {
            await new Promise(r => setTimeout(r, 100));
        }

        // Try to get available browser
        if (this.available.length > 0) {
            const browser = this.available.shift();

            // Check if browser is still connected
            if (browser.isConnected()) {
                return browser;
            } else {
                // Browser disconnected, create new one
                const newBrowser = await this.createBrowser();
                this.browsers.push(newBrowser);
                return newBrowser;
            }
        }

        // No browsers available, create temporary one
        console.log('[POOL] No browsers available, creating temporary');
        return await this.createBrowser();
    }

    release(browser, temporary = false) {
        if (temporary || !this.browsers.includes(browser)) {
            // Temporary browser, close it
            browser.close().catch(() => { });
        } else {
            // Return to pool
            this.available.push(browser);
        }
    }

    async cleanup() {
        console.log('[POOL] Cleaning up browser pool');
        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (e) { }
        }
        this.browsers = [];
        this.available = [];
    }
}

// Global pool instance
const browserPool = new BrowserPool(2);

// Initialize pool on startup
browserPool.initialize().catch(e =>
    console.error('[POOL] Initialization error:', e.message)
);

module.exports = { browserPool };
