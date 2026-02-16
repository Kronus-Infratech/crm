const { baseTemplate } = require('./base');

/**
 * Password reset email template
 */
const passwordResetTemplate = (data) => {
    const { name, resetUrl } = data;

    const content = `
    <h1>Reset your password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset the password for your account. Click the button below to proceed:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Reset Password</a>
    </div>
    <p>If you didn't request this, you can safely ignore this email. The link will expire in 1 hour.</p>
  `;

    return {
        subject: 'Password Reset Request - Kronus CRM',
        html: baseTemplate(content),
        text: `Hi ${name}, Reset your password here: ${resetUrl}`
    };
};

module.exports = { passwordResetTemplate };
