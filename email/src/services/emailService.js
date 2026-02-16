const { transporter } = require('../config/nodemailer');
const { DEFAULT_FROM_NAME } = require('../config/constants');
const queueService = require('./queueService');

// Import all templates
const { passwordResetTemplate } = require('../templates/passwordReset');
const { welcomeTemplate } = require('../templates/welcome');
const { leadAssignmentTemplate } = require('../templates/leadAssignment');
const { followUpReminderTemplate } = require('../templates/followUpReminder');
const { leadWelcomeTemplate } = require('../templates/leadWelcome');
const { leadFeedbackTemplate } = require('../templates/leadFeedback');
const { ledgerOpenedTemplate } = require('../templates/ledgerOpened');
const { ceoNotificationTemplate } = require('../templates/ceoNotification');

/**
 * Template mapping
 */
const TEMPLATE_MAP = {
  PASSWORD_RESET: passwordResetTemplate,
  WELCOME: welcomeTemplate,
  LEAD_ASSIGNMENT: leadAssignmentTemplate,
  FOLLOW_UP_REMINDER: followUpReminderTemplate,
  LEAD_WELCOME: leadWelcomeTemplate,
  LEAD_FEEDBACK: leadFeedbackTemplate,
  LEDGER_OPENED: ledgerOpenedTemplate,
  CEO_NOTIFICATION: ceoNotificationTemplate
};

/**
 * Internal function to actually perform the sending
 * @param {object} options - Email options
 */
const performSendEmail = async (options) => {
  const message = {
    from: `${options.fromName || DEFAULT_FROM_NAME} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.to || options.email,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments || [],
  };

  const info = await transporter.sendMail(message);
  return info;
};

// Register the worker function with the queue
queueService.registerSendFunction(performSendEmail);

/**
 * Queue email for sending
 * @param {object} options - Email options
 */
const sendEmail = async (options) => {
  const recipient = options.to || options.email;
  if (!recipient) {
    console.error('[EmailService] Attempted to send email but recipient address is missing!', options.subject);
    return { queued: false, error: 'Recipient address missing' };
  }
  
  // Add to queue and return immediately (async)
  await queueService.add(options);
  return { queued: true };
};

/**
 * Send template-based email
 * @param {string} templateName - Template type
 * @param {string} to - Recipient email
 * @param {object} data - Template data
 */
const sendTemplateEmail = async (templateName, to, data) => {
  const templateFn = TEMPLATE_MAP[templateName];
  
  if (!templateFn) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  // Add frontendUrl to data if not present
  if (!data.frontendUrl) {
    data.frontendUrl = process.env.FRONTEND_URL;
  }

  const { subject, html, text } = templateFn(data);
  
  return await sendEmail({
    to,
    subject,
    html,
    text
  });
};

/**
 * Get queue status
 */
const getQueueStatus = () => {
  return queueService.getStatus();
};

module.exports = {
  sendEmail,
  sendTemplateEmail,
  getQueueStatus
};
