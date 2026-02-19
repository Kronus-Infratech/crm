const prisma = require('../src/config/database');

async function fixIndex() {
  try {
    // Drop the existing non-sparse unique index
    const dropResult = await prisma.$runCommandRaw({
      dropIndexes: 'map_properties',
      index: 'map_properties_inventoryItemId_key'
    });
    console.log('Dropped index:', JSON.stringify(dropResult));

    // Create a new unique index with partial filter expression
    // This only enforces uniqueness when inventoryItemId is a string (non-null)
    const createResult = await prisma.$runCommandRaw({
      createIndexes: 'map_properties',
      indexes: [{
        key: { inventoryItemId: 1 },
        name: 'map_properties_inventoryItemId_key',
        unique: true,
        partialFilterExpression: { inventoryItemId: { $type: 'string' } }
      }]
    });
    console.log('Created partial index:', JSON.stringify(createResult));

    console.log('Done! Multiple map properties can now have null inventoryItemId.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

fixIndex();
