const { baseTemplate } = require('./base');

/**
 * Ledger opened notification email template
 */
const ledgerOpenedTemplate = (data) => {
  const { leadName, leadId, salesmanName, frontendUrl } = data;
  
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
      <a href="${frontendUrl}/leads/${leadId}/ledger" class="button">Access Ledger</a>
    </div>
  `;

  return {
    subject: `New Ledger Opened: ${leadName}`,
    html: baseTemplate(content),
    text: `New ledger initialized for ${leadName} by ${salesmanName}. Access it here: ${frontendUrl}/leads/${leadId}/ledger`
  };
};

module.exports = { ledgerOpenedTemplate };
