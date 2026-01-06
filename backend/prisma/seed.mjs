import { PrismaClient } from '@prisma/client';
import { fakerEN_IN as faker } from '@faker-js/faker';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { sendLeadAssignmentEmail } = require('../src/utils/emailUtils');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();
const LEAD_COUNT =10; 

function randomEnum(values) {
  return values[Math.floor(Math.random() * values.length)];
}

async function main() {
  console.log('🌱 Seeding leads with email notifications...');

  const users = await prisma.user.findMany({
    where:{
      email: {
        contains: "satyarth@kronusinfra.org"
      }
    },
    select: { id: true, name: true, email: true },
  });

  if (!users.length) {
    throw new Error('No users found. Seed users first.');
  }

  const leadSources = [
    'WEBSITE', 'REFERRAL', 'INSTAGRAM', 'YOUTUBE', 'EMAIL', 'WHATSAPP',
    'NINETY_NINE_ACRES', 'MAGICBRICKS', 'OLX', 'COLD_OUTREACH', 'WALK_IN'
  ];

  const leadStatuses = [
    'NEW', 'CONTACTED', 'INTERESTED', 'NOT_INTERESTED', 'SITE_VISIT',
    'NEGOTIATION', 'DOCUMENTATION', 'WON', 'LOST',
  ];

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  for (let i = 0; i < LEAD_COUNT; i++) {
    const createdBy = faker.helpers.arrayElement(users);
    const assignedTo = faker.helpers.arrayElement(users);

    const leadData = {
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      email: faker.internet.email(),
      phone: String(faker.number.int({ min: 6000000000, max: 9999999999 })),
      property: faker.location.streetAddress(),
      source: randomEnum(leadSources),
      status: randomEnum(leadStatuses),
      priority: randomEnum(priorities),
      value: faker.number.int({ min: 1000000, max: 9999999 }),
      followUpDate: faker.date.future(),
      createdById: createdBy.id,
      assignedToId: assignedTo.id,
    };

    const lead = await prisma.lead.create({
      data: leadData,
    });

    // Send email to assignee
    // try {
    //   await sendLeadAssignmentEmail(assignedTo.email, assignedTo.name, lead.name, lead.id);
    //   console.log(`📧 Notification sent to ${assignedTo.name} for lead: ${lead.name}`);
    // } catch (error) {
    //   console.error(`❌ Failed to send email to ${assignedTo.name}:`, error.message);
    // }
  }

  console.log(`✅ Seeded ${LEAD_COUNT} leads with notifications`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
