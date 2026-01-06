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

  // Seed Inventory Projects and Items
  console.log('🏢 Seeding Inventory Projects...');

  const projects = [
    { name: 'Sector 15 Extension', location: 'Greater Noida', description: 'Premium residential plots' },
    { name: 'Omaxe City', location: 'Noida', description: 'Luxury villas and plots' },
    { name: 'Gaur City 2', location: 'Greater Noida West', description: 'Affordable housing plots' }
  ];

  const createdProjects = [];
  for (const proj of projects) {
    const existing = await prisma.project.findUnique({ where: { name: proj.name } });
    if (!existing) {
      const created = await prisma.project.create({ data: proj });
      createdProjects.push(created);
      console.log(`  ✓ Created project: ${created.name}`);
    } else {
      createdProjects.push(existing);
      console.log(`  ↻ Project already exists: ${existing.name}`);
    }
  }

  console.log('🏘️  Seeding Inventory Items...');
  const facings = ['North', 'South', 'East', 'West', 'North-East', 'South-West'];
  const blocks = ['A', 'B', 'C', 'D', 'E'];
  const statuses = ['AVAILABLE', 'SOLD', 'BLOCKED'];

  let itemCount = 0;
  for (const project of createdProjects) {
    const numItems = faker.number.int({ min: 5, max: 10 });
    
    for (let i = 0; i < numItems; i++) {
      const size = faker.number.int({ min: 100, max: 500 });
      const ratePerSqYard = faker.number.int({ min: 5000, max: 15000 });
      const totalPrice = size * ratePerSqYard;
      const status = randomEnum(statuses);

      await prisma.inventoryItem.create({
        data: {
          plotNumber: `${faker.number.int({ min: 1, max: 999 })}${randomEnum(['', 'A', 'B', 'C'])}`,
          block: randomEnum(blocks),
          size: `${size} sqyd`,
          ratePerSqYard,
          totalPrice,
          facing: randomEnum(facings),
          roadWidth: `${randomEnum([20, 30, 40, 60])}ft`,
          paymentTime: randomEnum(['30 Days', '45 Days', '60 Days', 'Immediate']),
          paymentCondition: randomEnum(['Full Payment', '50% Down', '30-70 Split']),
          circleRate: faker.number.int({ min: 4000, max: 12000 }),
          status,
          ownerName: status === 'AVAILABLE' ? faker.person.fullName() : null,
          ownerContact: status === 'AVAILABLE' ? String(faker.number.int({ min: 6000000000, max: 9999999999 })) : null,
          askingPrice: totalPrice + faker.number.int({ min: 50000, max: 200000 }),
          reference: faker.helpers.arrayElement(['Direct', 'Broker', 'Agent', null]),
          amenities: faker.helpers.arrayElement(['Park Facing', 'Corner Plot', 'Main Road', null]),
          maintenanceCharges: faker.number.int({ min: 1000, max: 5000 }),
          clubCharges: faker.number.int({ min: 5000, max: 20000 }),
          cannesCharges: faker.number.int({ min: 2000, max: 8000 }),
          soldTo: status === 'SOLD' ? faker.person.fullName() : null,
          soldDate: status === 'SOLD' ? faker.date.past() : null,
          projectId: project.id
        }
      });
      itemCount++;
    }
  }

  console.log(`✅ Seeded ${itemCount} inventory items across ${createdProjects.length} projects`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
