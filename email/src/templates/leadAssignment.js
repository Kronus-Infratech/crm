const { baseTemplate } = require('./base');

/**
 * Lead assignment email template
 */
const leadAssignmentTemplate = (data) => {
    const { userName, leadName, leadId, frontendUrl } = data;

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
      <a href="${frontendUrl}/leads" class="button">View Lead Details</a>
    </div>
    
    <p>Success is where preparation and opportunity meet. Good luck!</p>
  `;

    return {
        subject: 'New Lead Assigned: ' + leadName,
        html: baseTemplate(content),
        text: `Hi ${userName}, a new lead (${leadName}) has been assigned to you. Access it here: ${frontendUrl}/leads`
    };
};

module.exports = { leadAssignmentTemplate };
