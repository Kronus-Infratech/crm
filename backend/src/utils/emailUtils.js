const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const emailQueueService = require('../services/emailQueueService');

/**
 * Create email transporter
 */
const createTransporter = () => {
  const config = {
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
    },
  };

  // If using Gmail, 'service' is more reliable than manual host/port
  if (process.env.EMAIL_USER?.endsWith('@gmail.com') || process.env.EMAIL_HOST?.includes('google')) {
    config.service = 'gmail';
  } else {
    config.host = process.env.EMAIL_HOST;
    config.port = process.env.EMAIL_PORT;
    config.secure = process.env.EMAIL_PORT == 465;
  }

  return nodemailer.createTransport(config);
};

/**
 * Internal function to actually perform the sending
 * @param {object} options - Email options
 */
const performSendEmail = async (options) => {
  const transporter = createTransporter();

  const message = {
    from: `${options.fromName || 'Kronus CRM'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  const info = await transporter.sendMail(message);
  return info;
};

// Register the worker function with the queue
emailQueueService.registerSendFunction(performSendEmail);

/**
 * Queue email for sending
 * @param {object} options - Email options
 */
const sendEmail = async (options) => {
  // Add to queue and return immediately (async)
  await emailQueueService.add(options);
  return { queued: true };
};

/**
 * Base template for emails
 */
const baseTemplate = (content, title) => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; }
      .wrapper { width: 100%; padding: 40px 0; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      .header { background: #4f46e5; padding: 32px; text-align: center; }
      .logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin: 0; text-transform: uppercase; }
      .content { padding: 40px; line-height: 1.6; }
      h1 { font-size: 24px; font-weight: 700; color: #1e293b; margin-top: 0; margin-bottom: 16px; }
      p { margin-bottom: 20px; font-size: 16px; color: #475569; }
      .button { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; margin: 24px 0; }
      .card { background: #f1f5f9; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin: 24px 0; }
      .footer { text-align: center; padding: 32px; font-size: 14px; color: #94a3b8; }
      .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="logo">KRONUS Infratech & Consultants</div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Kronus Infra. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetUrl, name) => {
  const content = `
    <h1>Reset your password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset the password for your account. Click the button below to proceed:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    <p>If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
  `;

  await sendEmail({
    email,
    subject: 'Password Reset Request - Kronus CRM',
    html: baseTemplate(content),
    text: `Hi ${name}, Reset your password here: ${resetUrl}`,
  });
};

/**
 * Send welcome email
 */
const sendWelcomeEmail = async (email, name, tempPassword) => {
  const content = `
    <div class="badge">Welcome aboard</div>
    <h1>Account Created Successfully</h1>
    <p>Hi ${name},</p>
    <p>Welcome to the <strong>Kronus CRM</strong> family! Your professional workspace is ready and waiting for you.</p>
    
    ${tempPassword ? `
    <div class="card">
      <p style="margin-top: 0; font-weight: 600; color: #1e293b;">Your Temporary Credentials</p>
      <div style="background: #ffffff; padding: 16px; border-radius: 8px; font-family: monospace; font-size: 18px; border: 1px solid #e2e8f0; text-align: center; letter-spacing: 2px;">
        ${tempPassword}
      </div>
      <p style="margin-bottom: 0; margin-top: 12px; font-size: 13px; color: #ef4444;">
        * For security, please change this password immediately after your first login.
      </p>
    </div>
    ` : ''}

    <p>Click the button below to access your dashboard and start managing your leads.</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/login" class="button">Login to CRM</a>
    </div>
    
    <p>If you have any questions, our support team is always here to help.</p>
  `;

  await sendEmail({
    email,
    subject: 'Welcome to Kronus CRM',
    html: baseTemplate(content),
    text: `Hi ${name}, Welcome to Kronus CRM! ${tempPassword ? `Your temp password: ${tempPassword}` : ''}`,
  });
};

/**
 * Send lead assignment email
 */
const sendLeadAssignmentEmail = async (userEmail, userName, leadName, leadId) => {
  const content = `
    <div class="badge" style="background: #dcfce7; color: #15803d;">New Assignment</div>
    <h1>New Lead Assigned to You</h1>
    <p>Hi ${userName},</p>
    <p>A new lead has been assigned to you. It's time to reach out and close the deal!</p>
    
    <div class="card">
      <p style="margin: 0; font-weight: 600; color: #1e293b;">Lead Detail</p>
      <p style="margin: 8px 0 0 0; font-size: 18px; color: #4f46e5; font-weight: 700;">${leadName}</p>
    </div>

    <p>Check the lead details and history on your dashboard:</p>
    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/leads" class="button">View Lead Details</a>
    </div>
    
    <p>Success is where preparation and opportunity meet. Good luck!</p>
  `;

  await sendEmail({
    email: userEmail,
    subject: 'New Lead Assigned: ' + leadName,
    html: baseTemplate(content),
    text: `Hi ${userName}, a new lead (${leadName}) has been assigned to you. Access it here: ${process.env.FRONTEND_URL}/leads`,
  });
};

/**
 * Send follow-up reminder email to agent
 */
const sendFollowUpReminderEmail = async (agentEmail, agentName, leads, timeContext) => {
  const leadsHtml = leads.map(lead => `
    <div style="border-left: 4px solid #4f46e5; padding: 12px; margin-bottom: 12px; background: #f8fafc;">
      <p style="margin: 0; font-weight: 700; color: #1e293b;">${lead.name}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Property: ${lead.property || 'Not specified'}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Phone: ${lead.phone}</p>
    </div>
  `).join('');

  const content = `
    <div class="badge" style="background: #e0e7ff; color: #4338ca;">Follow-up Reminder</div>
    <h1>${timeContext === 'tomorrow' ? "Tomorrow's" : "Today's"} Follow-up Schedule</h1>
    <p>Hi ${agentName},</p>
    <p>You have <strong>${leads.length}</strong> ${leads.length === 1 ? 'lead' : 'leads'} scheduled for follow-up ${timeContext}. Here are the details:</p>
    
    <div style="margin: 24px 0;">
      ${leadsHtml}
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/leads" class="button">Open CRM Dashboard</a>
    </div>
    
    <p>Proactive follow-up is the key to conversion. Have a productive day!</p>
  `;

  await sendEmail({
    email: agentEmail,
    subject: `Follow-up Reminder: ${leads.length} leads for ${timeContext}`,
    html: baseTemplate(content),
    text: `Hi ${agentName}, you have ${leads.length} follow-ups scheduled for ${timeContext}. Check your CRM dashboard for details.`,
  });
};

/**
 * Send welcome email to new lead
 */
const sendLeadWelcomeEmail = async (email, name) => {
  const content = `
    <div class="badge" style="background: #e0e7ff; color: #4338ca;">Welcome</div>
    <h1>Welcome to Kronus Infratech!</h1>
    <p>Hi ${name},</p>
    <p>Thank you for your interest in Kronus Infratech & Consultants. We are thrilled to have you with us.</p>
    <p>Our team is reviewing your requirements and will get back to you shortly.</p>
    
    <div class="card">
      <p style="margin: 0; font-weight: 600; color: #1e293b;">What Happens Next?</p>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #475569;">
        <li>Review of your inquiry</li>
        <li>Assignment to a dedicated consultant</li>
        <li>Personalized property recommendations</li>
      </ul>
    </div>

    <p>If you have any immediate questions, feel free to reply to this email.</p>
  `;

  await sendEmail({
    email,
    subject: 'Welcome to Kronus Infratech',
    html: baseTemplate(content),
    text: `Hi ${name}, Welcome to Kronus Infratech! We have received your inquiry and will be in touch shortly.`,
  });
};

/**
 * Send feedback email to closed lead
 */
const sendLeadFeedbackEmail = async (email, name, status, token) => {
  const isWon = status === 'WON';
  const subject = isWon ? 'Congratulations on Your New Property!' : 'We Value Your Feedback';
  const feedbackLink = `${process.env.FRONTEND_URL}/feedback/${token}`;

  let bodyContent = '';

  if (isWon) {
    bodyContent = `
      <p>Congratulations on finalizing your property with Kronus Infratech! It was a pleasure serving you.</p>
      <p>We hope you are satisfied with our services. We would love to hear about your experience.</p>
    `;
  } else {
    bodyContent = `
      <p>We noticed that we couldn't proceed with your requirement at this time.</p>
      <p>We surely missed an opportunity to serve you better. We would appreciate your feedback on how we can improve.</p>
    `;
  }

  const content = `
    <div class="badge" style="background: ${isWon ? '#dcfce7' : '#f1f5f9'}; color: ${isWon ? '#15803d' : '#64748b'};">${isWon ? 'Success' : 'Feedback'}</div>
    <h1>${isWon ? 'Congratulations!' : 'Your Feedback Matters'}</h1>
    <p>Hi ${name},</p>
    ${bodyContent}
    
    <div style="text-align: center;">
      <a href="${feedbackLink}" class="button">Share Your Feedback</a>
    </div>
    
    <p>Thank you for choosing Kronus Infratech.</p>
  `;

  await sendEmail({
    email,
    subject: subject,
    html: baseTemplate(content),
    text: `Hi ${name}, ${isWon ? 'Congratulations on your new property!' : 'We missed an opportunity to serve you better.'} Please share your feedback here: ${feedbackLink}`,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendLeadAssignmentEmail,
  sendFollowUpReminderEmail,
  sendLeadWelcomeEmail,
  sendLeadFeedbackEmail,
};
