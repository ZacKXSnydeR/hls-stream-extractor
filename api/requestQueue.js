/**
 * Request Queue Manager
 * Prevents overload by queuing concurrent requests
 */

class RequestQueue {
    constructor(maxConcurrent = 2) { // Max 2 parallel extractions
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    async process(fn) {
        // Wait if at capacity
        while (this.running >= this.maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.running++;
        console.log(`[QUEUE] Running: ${this.running}, Queued: ${this.queue.length}`);

        try {
            const result = await fn();
            return result;
        } finally {
            this.running--;
        }
    }

    getStats() {
        return {
            running: this.running,
            queued: this.queue.length,
            capacity: this.maxConcurrent
        };
    }
}

const requestQueue = new RequestQueue(2);

module.exports = { requestQueue };
