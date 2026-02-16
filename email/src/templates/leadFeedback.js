const { baseTemplate } = require('./base');

/**
 * Lead feedback email template
 */
const leadFeedbackTemplate = (data) => {
  const { name, status, token, frontendUrl } = data;
  
  const isWon = status === 'CONVERTED';
  const subject = isWon ? 'Congratulations on Your New Property!' : 'We Value Your Feedback';
  const feedbackLink = `${frontendUrl}/feedback/${token}`;

  let bodyContent = '';

  if (isWon) {
    bodyContent = `
      <p>Congratulations on finalizing your property with Kronus Infratech and Consultants! It was a pleasure serving you.</p>
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
    
    <p>Thank you for choosing Kronus Infratech and Consultants.</p>
  `;

  return {
    subject: subject,
    html: baseTemplate(content),
    text: `Hi ${name}, ${isWon ? 'Congratulations on your new property!' : 'We missed an opportunity to serve you better.'} Please share your feedback here: ${feedbackLink}`
  };
};

module.exports = { leadFeedbackTemplate };
