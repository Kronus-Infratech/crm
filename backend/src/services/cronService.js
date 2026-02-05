const cron = require('node-cron');
const prisma = require('../config/database');
const { sendFollowUpReminderEmail } = require('../utils/emailUtils');

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
      sendFollowUpReminderEmail(
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

    const { sendCEONotificationEmail } = require('../utils/emailUtils');

    // Notify CEO for each missed lead
    // (In a high volume system, we might want to aggregate these, but for now individual is more surgical)
    for (const lead of missedLeads) {
      const salesmanName = lead.assignedTo?.name || 'Unassigned';
      const delayDays = Math.floor((new Date() - new Date(lead.followUpDate)) / (1000 * 60 * 60 * 24));
      
      await sendCEONotificationEmail(
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

module.exports = { initCronJobs };
