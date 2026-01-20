/**
 * Result Cache Manager
 * Caches extraction results to avoid re-extraction
 */

class ResultCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutes

        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    set(url, result) {
        this.cache.set(url, {
            result,
            timestamp: Date.now()
        });
        console.log(`[CACHE] Stored result for: ${url.substring(0, 50)}`);
    }

    get(url) {
        const entry = this.cache.get(url);

        if (!entry) return null;

        // Check if expired
        if (Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(url);
            console.log(`[CACHE] Expired: ${url.substring(0, 50)}`);
            return null;
        }

        console.log(`[CACHE] Hit for: ${url.substring(0, 50)}`);
        return entry.result;
    }

    cleanup() {
        const now = Date.now();
        let removed = 0;

        for (const [url, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                this.cache.delete(url);
                removed++;
            }
        }

        if (removed > 0) {
            console.log(`[CACHE] Cleaned ${removed} expired entries`);
        }
    }

    clear() {
        this.cache.clear();
        console.log('[CACHE] Cleared all entries');
    }

    size() {
        return this.cache.size;
    }
}

const resultCache = new ResultCache();

module.exports = { resultCache };
