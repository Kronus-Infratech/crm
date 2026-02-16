const cron = require('node-cron');
const prisma = require('../config/database');
const emailClient = require('../services/emailClient');
const { getReportingData, generateReportPDF } = require('./reportService');

/**
 * Initialize all scheduled tasks
 */
const initCronJobs = () => {
  // 1. Every day at 3 PM (15:00): Remind about tomorrow's follow-ups
  cron.schedule('0 15 * * *', async () => {
    console.log('Running 3 PM Cron: Fetching tomorrow\'s follow-ups...');
    await processFollowUpReminders('tomorrow');
  }, {
    timezone: "Asia/Kolkata"
  });

  // 2. Every day at 11 AM (11:00): Remind about today's follow-ups
  cron.schedule('0 11 * * *', async () => {
    console.log('Running 11 AM Cron: Fetching today\'s follow-ups...');
    await processFollowUpReminders('today');
  }, {
    timezone: "Asia/Kolkata"
  });

  // 3. Every day at 9:30 AM: Check for missed follow-ups and notify CEO
  cron.schedule('30 9 * * *', async () => {
    console.log('Running 9:30 AM Cron: Checking for missed follow-ups...');
    await processMissedFollowUps();
  }, {
    timezone: "Asia/Kolkata"
  });

  // 4. Daily Organization Report: Every day at 7:00 PM (19:00)
  cron.schedule('0 19 * * *', async () => {
    console.log('Running 7 PM Cron: Generating Daily Organization Report...');
    await sendAutomatedReport('Daily');
  }, {
    timezone: "Asia/Kolkata"
  });

  // 5. Weekly Organization Report: Every Monday at 8:00 PM (20:00)
  cron.schedule('0 20 * * 1', async () => {
    console.log('Running 8 PM Cron: Generating Weekly Organization Report...');
    await sendAutomatedReport('Weekly');
  }, {
    timezone: "Asia/Kolkata"
  });
};

/**
 * Common logic to fetch leads and send emails
 * @param {string} type - 'today' or 'tomorrow'
 */
const processFollowUpReminders = async (type) => {
  try {
    const targetDate = new Date();
    if (type === 'tomorrow') {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Start and end of the target day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch leads with followUpDate on the target day and an assigned agent
    const leads = await prisma.lead.findMany({
      where: {
        followUpDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        assignedToId: { not: null },
        status: { notIn: ['CONVERTED', 'NOT_CONVERTED'] }, // Only active leads
      },
      include: {
        assignedTo: true,
      },
    });

    if (leads.length === 0) {
      console.log(`No follow-ups found for ${type}.`);
      return;
    }

    // Group leads by agent
    const agentGroups = leads.reduce((acc, lead) => {
      const agentId = lead.assignedTo.id;
      if (!acc[agentId]) {
        acc[agentId] = {
          agent: lead.assignedTo,
          leads: [],
        };
      }
      acc[agentId].leads.push(lead);
      return acc;
    }, {});

    // Send emails to each agent
    const emailPromises = Object.values(agentGroups).map(group =>
      emailClient.sendFollowUpReminderEmail(
        group.agent.email,
        group.agent.name,
        group.leads,
        type
      )
    );

    await Promise.all(emailPromises);
    console.log(`Successfully sent follow-up reminders for ${type} to ${Object.keys(agentGroups).length} agents.`);
  } catch (error) {
    console.error(`Error in ${type} follow-up cron:`, error);
  }
};

/**
 * Identify leads with missed follow-up dates and notify CEO
 */
const processMissedFollowUps = async () => {
  try {
    const yesterday = new Date();
    yesterday.setHours(0, 0, 0, 0);

    // Find leads where followUpDate is in the past AND status is not closed
    const missedLeads = await prisma.lead.findMany({
      where: {
        followUpDate: {
          lt: yesterday // Anything before today
        },
        status: { notIn: ['CONVERTED', 'NOT_CONVERTED'] },
      },
      include: {
        assignedTo: true,
      }
    });

    if (missedLeads.length === 0) {
      console.log('No missed follow-ups detected.');
      return;
    }



    // Notify CEO for each missed lead
    // (In a high volume system, we might want to aggregate these, but for now individual is more surgical)
    for (const lead of missedLeads) {
      const salesmanName = lead.assignedTo?.name || 'Unassigned';
      const delayDays = Math.floor((new Date() - new Date(lead.followUpDate)) / (1000 * 60 * 60 * 24));

      await emailClient.sendCEONotificationEmail(
        lead.name,
        lead.id,
        'MISSED_FOLLOWUP',
        salesmanName,
        `Follow-up was scheduled for ${lead.followUpDate.toLocaleDateString()}. It is now delayed by ${delayDays} day(s).`
      ).catch(err => console.error(`Failed to notify CEO about missed lead ${lead.id}:`, err));
    }

    console.log(`Processed ${missedLeads.length} missed follow-ups.`);
  } catch (error) {
    console.error('Error in missed follow-up cron:', error);
  }
};

/**
 * Generates and emails the report
 * @param {string} type - 'Daily' or 'Weekly'
 */
const sendAutomatedReport = async (type) => {
  try {
    const now = new Date();
    let startDate = new Date();

    if (type === 'Daily') {
      // From start of today
      startDate.setHours(0, 0, 0, 0);
    } else {
      // From start of last 7 days (Monday report, end of week)
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    }

    const data = await getReportingData({ startDate, endDate: now });
    const fullVectors = ['orgStats', 'rankings', 'agentMetrics', 'feedback'];
    const pdfBuffer = await generateReportPDF(data, fullVectors);

    const dateString = now.toISOString().split('T')[0];
    const subject = `[CRM] ${type} Business Report - ${dateString}`;

    const html = `
            <div style="font-family: sans-serif; color: #333;">
                <p>Hey,</p>
                <p>Please find attached the <strong>${type} Business Report</strong> for the period ending ${dateString}.</p>
                <p>The report is generated automatically by the Kronus CRM.</p>
            </div>
        `;

    await emailClient.sendEmail({
      email: 'ceo@kronusinfra.org',
      subject: subject,
      html: html,
      attachments: [
        {
          filename: `Kronus_${type}_Report_${dateString}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log(`[Cron] ${type} Report successfully sent to CEO.`);
  } catch (error) {
    console.error(`[Cron] Failed to process ${type} automated report:`, error.message);
  }
};

module.exports = { initCronJobs, sendAutomatedReport };
