const axios = require('axios');

/**
 * Email Service HTTP Client
 * Communicates with the standalone email microservice
 */
class EmailClient {
    constructor() {
        this.baseURL = process.env.EMAIL_SERVICE_URL;
        this.apiKey = process.env.EMAIL_SERVICE_API_KEY;

        if (!this.apiKey) {
            console.warn('[EmailClient] WARNING: EMAIL_SERVICE_API_KEY not set. Email functionality will not work.');
        }

        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey
            },
            timeout: 10000 // 10 second timeout
        });
    }

    /**
     * Send a generic email
     * @param {object} options - Email options
     */
    async sendEmail(options) {
        try {
            const response = await this.client.post('/api/email/send', {
                to: options.email || options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
                fromName: options.fromName
            });

            return response.data;
        } catch (error) {
            console.error('[EmailClient] Failed to send email:', error.message);
            throw error;
        }
    }

    /**
     * Send a template-based email
     * @param {string} template - Template name
     * @param {string} to - Recipient email
     * @param {object} data - Template data
     */
    async sendTemplateEmail(template, to, data) {
        try {
            const response = await this.client.post('/api/email/send-template', {
                template,
                to,
                data
            });

            return response.data;
        } catch (error) {
            console.error('[EmailClient] Failed to send template email:', error.message);
            throw error;
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetUrl, name) {
        return this.sendTemplateEmail('PASSWORD_RESET', email, { name, resetUrl });
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, name, tempPassword) {
        return this.sendTemplateEmail('WELCOME', email, { name, tempPassword });
    }

    /**
     * Send lead assignment email
     */
    async sendLeadAssignmentEmail(userEmail, userName, leadName, leadId) {
        return this.sendTemplateEmail('LEAD_ASSIGNMENT', userEmail, { userName, leadName, leadId });
    }

    /**
     * Send follow-up reminder email
     */
    async sendFollowUpReminderEmail(agentEmail, agentName, leads, timeContext) {
        return this.sendTemplateEmail('FOLLOW_UP_REMINDER', agentEmail, { agentName, leads, timeContext });
    }

    /**
     * Send lead welcome email
     */
    async sendLeadWelcomeEmail(email, name) {
        return this.sendTemplateEmail('LEAD_WELCOME', email, { name });
    }

    /**
     * Send lead feedback email
     */
    async sendLeadFeedbackEmail(email, name, status, token) {
        return this.sendTemplateEmail('LEAD_FEEDBACK', email, { name, status, token });
    }

    /**
     * Send ledger opened email
     */
    async sendLedgerOpenedEmail(emails, leadName, leadId, salesmanName) {
        // Filter out any empty/null emails
        const validEmails = emails.filter(e => e && e.trim() !== '');
        if (validEmails.length === 0) return;

        await Promise.all(validEmails.map(email =>
            this.sendTemplateEmail('LEDGER_OPENED', email, { leadName, leadId, salesmanName })
        ));
    }

    /**
     * Send CEO notification email
     */
    async sendCEONotificationEmail(leadName, leadId, type, salesmanName, additionalInfo = '') {
        return this.sendTemplateEmail('CEO_NOTIFICATION', 'ceo@kronusinfra.org', {
            leadName,
            leadId,
            type,
            salesmanName,
            additionalInfo
        });
    }

    /**
     * Get queue status
     */
    async getQueueStatus() {
        try {
            const response = await this.client.get('/api/email/queue/status');
            return response.data;
        } catch (error) {
            console.error('[EmailClient] Failed to get queue status:', error.message);
            throw error;
        }
    }
}

// Export singleton instance
module.exports = new EmailClient();
