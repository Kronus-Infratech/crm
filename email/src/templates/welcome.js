const { baseTemplate } = require('./base');

/**
 * Welcome email template for new users
 */
const welcomeTemplate = (data) => {
    const { name, tempPassword, frontendUrl } = data;

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
      <a href="${frontendUrl}/login" class="button">Login to CRM</a>
    </div>
    
    <p>If you have any questions, our support team is always here to help.</p>
  `;

    return {
        subject: 'Welcome to Kronus CRM',
        html: baseTemplate(content),
        text: `Hi ${name}, Welcome to Kronus CRM! ${tempPassword ? `Your temp password: ${tempPassword}` : ''}`
    };
};

module.exports = { welcomeTemplate };
