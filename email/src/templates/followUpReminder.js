const { baseTemplate } = require('./base');

/**
 * Follow-up reminder email template
 */
const followUpReminderTemplate = (data) => {
    const { agentName, leads, timeContext, frontendUrl } = data;

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
      <a href="${frontendUrl}/leads" class="button">Open CRM Dashboard</a>
    </div>
    
    <p>Proactive follow-up is the key to conversion. Have a productive day!</p>
  `;

    return {
        subject: `Follow-up Reminder: ${leads.length} leads for ${timeContext}`,
        html: baseTemplate(content),
        text: `Hi ${agentName}, you have ${leads.length} follow-ups scheduled for ${timeContext}. Check your CRM dashboard for details.`
    };
};

module.exports = { followUpReminderTemplate };
