const { baseTemplate } = require('./base');

/**
 * Lead welcome email template
 */
const leadWelcomeTemplate = (data) => {
  const { name } = data;
  
  const content = `
    <div class="badge" style="background: #e0e7ff; color: #4338ca;">Welcome</div>
    <h1>Welcome to Kronus Infratech and Consultants!</h1>
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

  return {
    subject: 'Welcome to Kronus Infratech and Consultants',
    html: baseTemplate(content),
    text: `Hi ${name}, Welcome to Kronus Infratech and Consultants! We have received your inquiry and will be in touch shortly.`
  };
};

module.exports = { leadWelcomeTemplate };
