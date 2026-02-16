const { baseTemplate } = require('./base');

/**
 * CEO notification email template
 */
const ceoNotificationTemplate = (data) => {
    const { leadName, leadId, type, salesmanName, additionalInfo = '', frontendUrl } = data;

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
      <a href="${frontendUrl}/leads" class="button">View Lead Data</a>
    </div>
  `;

    return {
        subject: subject,
        html: baseTemplate(content),
        text: `${title}: ${leadName} (Managed by ${salesmanName}). ${additionalInfo}`
    };
};

module.exports = { ceoNotificationTemplate };
