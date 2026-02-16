/**
 * Simple in-memory queue for asynchronous email processing
 */
class EmailQueueService {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.sendFunction = null;
        this.stats = {
            sent: 0,
            failed: 0,
            retrying: 0
        };
    }

    /**
     * Register the function that actually sends the email
     * @param {Function} fn - Async function that takes mailOptions and sends email
     */
    registerSendFunction(fn) {
        this.sendFunction = fn;
    }

    /**
     * Add an email job to the queue
     * @param {Object} mailOptions - Email options (to, subject, html, etc.)
     */
    async add(mailOptions) {
        const job = {
            ...mailOptions,
            attempts: 0,
            nextRetry: Date.now()
        };
        this.queue.push(job);
        console.log(`[EmailQueue] Job added. Queue size: ${this.queue.length}`);

        // Trigger processing without awaiting it (fire and forget)
        this.processQueue();
    }

    /**
     * Process the queue sequentially
     */
    async processQueue() {
        if (this.isProcessing) return;
        if (!this.sendFunction) {
            console.error('[EmailQueue] No send function registered!');
            return;
        }

        this.isProcessing = true;
        const MAX_RETRIES = 3;

        try {
            while (this.queue.length > 0) {
                const job = this.queue[0];

                // If it's a retry and not yet time, move to end and stop loop
                if (job.nextRetry > Date.now()) {
                    this.queue.push(this.queue.shift());
                    break;
                }

                try {
                    await this.sendFunction(job);
                    console.log(`[EmailQueue] Email sent successfully to ${job.to || job.email}`);
                    this.queue.shift(); // Remove on success
                    this.stats.sent++;
                } catch (error) {
                    job.attempts++;
                    console.error(`[EmailQueue] Attempt ${job.attempts}/${MAX_RETRIES} failed for ${job.to || job.email}:`, error.message);

                    if (job.attempts < MAX_RETRIES) {
                        // For serverless (Vercel), retry immediately instead of exponential backoff
                        // Vercel functions don't persist, so delayed retries won't work
                        const delay = 2000; // 2 seconds between retries
                        job.nextRetry = Date.now() + delay;

                        console.log(`[EmailQueue] Re-queuing email to ${job.to || job.email} for immediate retry in ${delay / 1000}s`);
                        this.queue.shift();
                        this.queue.push(job);
                        this.stats.retrying++;
                    } else {
                        console.error(`[EmailQueue] Max retries reached. Discarding email to ${job.to || job.email}`);
                        this.queue.shift();
                        this.stats.failed++;
                    }
                }

                // Small delay between emails
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (err) {
            console.error('[EmailQueue] Critical error in queue processor:', err);
        } finally {
            this.isProcessing = false;

            // If there are still items (likely due to backoff breaks), check again in 1 minute
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 60000);
            }
        }
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            isProcessing: this.isProcessing,
            stats: this.stats
        };
    }
}

module.exports = new EmailQueueService();
