import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const LEAD_COUNT = 100;

function randomEnum(values) {
  return values[Math.floor(Math.random() * values.length)];
}

async function main() {
  console.log('🌱 Seeding leads...');

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (!users.length) {
    throw new Error('No users found. Seed users first.');
  }

  const leadSources = [
    'WEBSITE',
    'REFERRAL',
    'SOCIAL_MEDIA',
    'EMAIL_CAMPAIGN',
    'COLD_CALL',
    'EVENT',
    'PARTNER',
    'OTHER',
  ];

  const leadStatuses = [
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'PROPOSAL',
    'NEGOTIATION',
    'WON',
    'LOST',
    'INACTIVE',
  ];

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  const leads = Array.from({ length: LEAD_COUNT }).map((_, index) => {
    const createdBy = faker.helpers.arrayElement(users);
    const assignedTo = faker.helpers.arrayElement(users);

    return {
      firstName: `test${index + 1}`,
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      phone: String(faker.number.int({ min: 6000000000, max: 9999999999 })),
      property: faker.location.streetAddress(),
      position: faker.person.jobTitle(),
      source: randomEnum(leadSources),
      status: randomEnum(leadStatuses),
      priority: randomEnum(priorities),
      estimatedValue: faker.number.int({ min: 1000, max: 500000 }),
      notes: faker.lorem.sentences(2),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
      createdById: createdBy.id,
      assignedToId: assignedTo.id,
    };
  });

  await prisma.lead.createMany({ data: leads });

  console.log(`✅ Seeded ${LEAD_COUNT} leads`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
