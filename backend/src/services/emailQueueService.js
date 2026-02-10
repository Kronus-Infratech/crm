/**
 * Simple in-memory queue for asynchronous email processing
 */
class EmailQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.sendFunction = null;
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
        // (This is a simple logic to avoid busy-waiting)
        if (job.nextRetry > Date.now()) {
          this.queue.push(this.queue.shift());
          break; 
        }

        try {
          await this.sendFunction(job);
          console.log(`[EmailQueue] Email sent successfully to ${job.to || job.email}`);
          this.queue.shift(); // Remove on success
        } catch (error) {
          job.attempts++;
          console.error(`[EmailQueue] Attempt ${job.attempts}/${MAX_RETRIES} failed for ${job.to || job.email}:`, error.message);
          
          if (job.attempts < MAX_RETRIES) {
            // Re-queue with exponential backoff (1m, 5m, 15m...)
            const delay = Math.pow(5, job.attempts) * 60 * 1000; 
            job.nextRetry = Date.now() + delay;
            
            console.log(`[EmailQueue] Re-queuing email to ${job.to || job.email} for retry in ${delay / 1000}s`);
            this.queue.shift();
            this.queue.push(job);
          } else {
            console.error(`[EmailQueue] Max retries reached. Discarding email to ${job.to || job.email}`);
            this.queue.shift(); 
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
}

module.exports = new EmailQueueService();
