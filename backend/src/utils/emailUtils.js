const nodemailer = require('nodemailer');

/**
 * Create email transporter
 */
const emailQueueService = require('../services/emailQueueService');

/**
 * Create email transporter
 */
const createTransporter = () => {
  const host = (process.env.EMAIL_HOST).trim();
  const port = parseInt(process.env.EMAIL_PORT);
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS)?.trim();
  
  // Secure: true for 465 (Direct SSL), false for 587 (STARTTLS)
  const isSecure = port === 465;

  console.log(`[EmailService] Connection Attempt: ${host}:${port} (Secure: ${isSecure})`);

  const config = {
    host,
    port,
    secure: isSecure,
    auth: {
      user: user,
      pass: pass,
    },
    // Extensive timeouts for cloud network jumps
    connectionTimeout: 45000, 
    greetingTimeout: 45000,
    socketTimeout: 60000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    debug: true,
    logger: true,
  };

  // IMPORTANT: For Port 587, you typically need to NOT use service: 'gmail' 
  // because that helper forces port 465. Only use it for SSL port.
  if (isSecure && (user?.endsWith('@gmail.com') || host.includes('google'))) {
    config.service = 'gmail';
  }

  return nodemailer.createTransport(config);
};

// Singleton transporter
const transporter = createTransporter();

/**
 * Internal function to actually perform the sending
 * @param {object} options - Email options
 */
const performSendEmail = async (options) => {
  const message = {
    from: `${options.fromName || 'Kronus Infratech & Consultants'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments || [],
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
  if (!options.email) {
    console.error('[EmailService] Attempted to send email but recipient address (options.email) is missing!', options.subject);
    return { queued: false, error: 'Recipient address missing' };
  }
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
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Kronus Infratech'}</title>
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        background-color: #f7f7f7; 
        color: #4a4a4a; 
        -webkit-font-smoothing: antialiased;
      }
      .wrapper { width: 100%; padding: 40px 0; }
      .container { 
        max-width: 600px; 
        margin: 0 auto; 
        background: #ffffff; 
        border-radius: 24px; 
        overflow: hidden; 
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #e5e7eb;
      }
      .header { 
        background: #4a4a4a; 
        padding: 40px 32px; 
        text-align: center;
        border-bottom: 4px solid #009688;
      }
      .logo { 
        color: #ffffff; 
        font-size: 28px; 
        font-weight: 900; 
        letter-spacing: -0.05em; 
        margin: 0; 
        text-transform: uppercase;
      }
      .logo span { color: #fbb03b; }
      .content { padding: 48px 40px; line-height: 1.8; background: #ffffff; }
      h1 { font-size: 28px; font-weight: 800; color: #4a4a4a; margin-top: 0; margin-bottom: 24px; letter-spacing: -0.02em; }
      p { margin-bottom: 24px; font-size: 16px; color: #666666; }
      .button { 
        display: inline-block; 
        background: #009688; 
        color: #ffffff !important; 
        padding: 16px 32px; 
        border-radius: 12px; 
        font-weight: 700; 
        text-decoration: none; 
        margin: 32px 0;
        box-shadow: 0 10px 15px -3px rgba(0, 150, 136, 0.3);
      }
      .card { 
        background: #fdfdfd; 
        border-radius: 16px; 
        padding: 24px; 
        border: 1px solid #f3f4f6; 
        margin: 32px 0;
        border-left: 4px solid #fbb03b;
      }
      .footer { 
        background: #4a4a4a;
        text-align: center; 
        padding: 48px 32px; 
        font-size: 14px; 
        color: #e5e5e5; 
      }
      .social-links { margin-bottom: 24px; }
      .social-links a { 
        display: inline-block; 
        margin: 0 12px; 
        color: #fbb03b; 
        text-decoration: none; 
        font-weight: 700;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .social-links a:hover { color: #ffffff; }
      .badge { 
        display: inline-block; 
        padding: 6px 14px; 
        border-radius: 8px; 
        background: #fbb03b; 
        color: #4a4a4a; 
        font-size: 11px; 
        font-weight: 800; 
        text-transform: uppercase; 
        margin-bottom: 16px; 
        letter-spacing: 0.1em;
      }
      .divider { height: 1px; background: #555555; margin: 24px 0; }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <div class="container">
        <div class="header">
          <div class="logo">KRONUS<span> Infra</span></div>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <div class="social-links">
            <a href="https://www.kronusinfra.com">Website</a>
            <a href="https://www.instagram.com/kronus_infratech">Instagram</a>
            <a href="https://www.youtube.com/@kronusinfratech">YouTube</a>
            <a href="https://www.facebook.com/Kronusinfra/">Facebook</a>
          </div>
          <div class="divider"></div>
          <p style="color: #cccccc; font-size: 12px; margin-bottom: 0;">
            © ${new Date().getFullYear()} Kronus Infratech & Consultants. <br>
            Office: Sonipat, Haryana, India.
          </p>
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
    <div style="border-left: 4px solid #009688; padding: 16px; margin-bottom: 16px; background: #ffffff; border-top: 1px solid #f3f4f6; border-right: 1px solid #f3f4f6; border-bottom: 1px solid #f3f4f6; border-radius: 0 12px 12px 0;">
      <p style="margin: 0; font-weight: 800; color: #4a4a4a; font-size: 16px;">${lead.name}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #666666;"><strong>Property:</strong> ${lead.property || 'Not specified'}</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: #009688;"><strong>Phone:</strong> ${lead.phone}</p>
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
  const isWon = status === 'CONVERTED';
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

/**
 * Send notification to Finance team when a ledger is opened
 */
const sendLedgerOpenedEmail = async (emails, leadName, leadId, salesmanName) => {
  const content = `
    <div class="badge" style="background: #e0f2fe; color: #0369a1;">Ledger Opened</div>
    <h1>New Ledger Awaiting Review</h1>
    <p>Finance Team,</p>
    <p>A new Running Ledger has been initialized for <strong>${leadName}</strong> by <strong>${salesmanName}</strong>.</p>
    
    <div class="card">
      <p style="margin: 0; font-weight: 600; color: #1e293b;">Action Required</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569;">Please review the payment milestones and document requirements to ensure financial compliance.</p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/leads/${leadId}/ledger" class="button">Access Ledger</a>
    </div>
  `;

  // Filter out any empty/null emails
  const validEmails = emails.filter(e => e && e.trim() !== '');
  if (validEmails.length === 0) return;

  await Promise.all(validEmails.map(email =>
    sendEmail({
      email,
      subject: `New Ledger Opened: ${leadName}`,
      html: baseTemplate(content),
      text: `New ledger initialized for ${leadName} by ${salesmanName}. Access it here: ${process.env.FRONTEND_URL}/leads/${leadId}/ledger`,
    })
  ));
};

/**
 * Send notification to CEO for critical lead updates
 */
const sendCEONotificationEmail = async (leadName, leadId, type, salesmanName, additionalInfo = '') => {
  let badgeColor = '#f1f5f9';
  let badgeTextColor = '#64748b';
  let title = 'Lead Update';
  let subject = `Lead Alert: ${leadName}`;

  if (type === 'CONVERTED') {
    badgeColor = '#dcfce7';
    badgeTextColor = '#15803d';
    title = 'Lead Successfully Converted';
    subject = `🏆 CONVERTED: ${leadName}`;
  } else if (type === 'NOT_CONVERTED') {
    badgeColor = '#fee2e2';
    badgeTextColor = '#b91c1c';
    title = 'Lead Not Converted (Lost)';
    subject = `❌ LOST: ${leadName}`;
  } else if (type === 'MISSED_FOLLOWUP') {
    badgeColor = '#fef3c7';
    badgeTextColor = '#92400e';
    title = 'Missed Follow-up Alert';
    subject = `⚠️ MISSED FOLLOW-UP: ${leadName}`;
  }

  const content = `
    <div class="badge" style="background: ${badgeColor}; color: ${badgeTextColor};">${type.replace('_', ' ')}</div>
    <h1>${title}</h1>
    <p>Sir,</p>
    <p>Regarding the lead <strong>${leadName}</strong> managed by <strong>${salesmanName}</strong>.</p>
    
    <div class="card">
      <p style="margin: 0; font-weight: 600; color: #1e293b;">Summary</p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569;">${additionalInfo || 'No additional notes provided.'}</p>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.FRONTEND_URL}/leads" class="button">View Lead Data</a>
    </div>
  `;

  await sendEmail({
    email: 'ceo@kronusinfra.org',
    subject: subject,
    html: baseTemplate(content),
    text: `${title}: ${leadName} (Managed by ${salesmanName}). ${additionalInfo}`,
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
  sendLedgerOpenedEmail,
  sendCEONotificationEmail,
};
