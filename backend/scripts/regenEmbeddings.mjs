/**
 * Re-generate all embeddings using the current embedding model (gemini-embedding-001, 3072 dims).
 * 
 * BEFORE RUNNING THIS SCRIPT:
 * 1. Update your MongoDB Atlas vector indexes to use 3072 dimensions instead of 768.
 *    Go to Atlas > Database > Search > Edit each vector_index:
 *    - Collection: leads       → path: notesEmbedding, dimensions: 3072, similarity: cosine
 *    - Collection: projects    → path: descriptionEmbedding, dimensions: 3072, similarity: cosine
 *    - Collection: inventory_items → path: descriptionEmbedding, dimensions: 3072, similarity: cosine
 * 
 * 2. Then run: node scripts/regenEmbeddings.mjs
 * 
 * This will process all records in batches with rate limiting to avoid API throttling.
 */

import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateEmbedding(text) {
    if (!text || typeof text !== 'string') return null;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent(text.replace(/\n/g, " "));
        return result.embedding.values;
    } catch (error) {
        console.error("  Embedding error:", error.message);
        return null;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ------- LEADS -------
async function regenLeads() {
    const leads = await prisma.lead.findMany({
        select: {
            id: true,
            name: true,
            property: true,
            source: true,
            status: true,
            budgetFrom: true,
            budgetTo: true,
            financeNotes: true,
        }
    });

    console.log(`\n📋 Re-embedding ${leads.length} leads...`);
    let success = 0, failed = 0;

    for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const textToEmbed = `
            Lead: ${lead.name}
            Property Interest: ${lead.property || "Any"}
            Source: ${lead.source}
            Status: ${lead.status}
            Budget: ${lead.budgetFrom || 0} - ${lead.budgetTo || "Max"}
            Notes: ${lead.financeNotes || ""}
        `.trim().replace(/\s+/g, " ");

        const embedding = await generateEmbedding(textToEmbed);
        if (embedding) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { notesEmbedding: embedding }
            });
            success++;
        } else {
            failed++;
        }

        if ((i + 1) % 10 === 0) {
            process.stdout.write(`  Progress: ${i + 1}/${leads.length}\r`);
            await sleep(500); // Rate limiting
        }
    }
    console.log(`  ✅ Leads: ${success} updated, ${failed} failed`);
}

// ------- PROJECTS -------
async function regenProjects() {
    const projects = await prisma.project.findMany({
        select: {
            id: true,
            name: true,
            location: true,
            description: true,
            city: { select: { name: true } }
        }
    });

    console.log(`\n Re-embedding ${projects.length} projects...`);
    let success = 0, failed = 0;

    for (let i = 0; i < projects.length; i++) {
        const p = projects[i];
        const textToEmbed = `
            Project: ${p.name}
            Location: ${p.location || ""}
            Description: ${p.description || ""}
            City: ${p.city?.name || ""}
        `.trim().replace(/\s+/g, " ");

        const embedding = await generateEmbedding(textToEmbed);
        if (embedding) {
            await prisma.project.update({
                where: { id: p.id },
                data: { descriptionEmbedding: embedding }
            });
            success++;
        } else {
            failed++;
        }

        if ((i + 1) % 10 === 0) {
            process.stdout.write(`  Progress: ${i + 1}/${projects.length}\r`);
            await sleep(500);
        }
    }
    console.log(`  ✅ Projects: ${success} updated, ${failed} failed`);
}

// ------- INVENTORY ITEMS -------
async function regenInventory() {
    const items = await prisma.inventoryItem.findMany({
        select: {
            id: true,
            propertyType: true,
            plotNumber: true,
            size: true,
            totalPrice: true,
            askingPrice: true,
            condition: true,
            description: true,
            gatedColony: true,
            corner: true,
            construction: true,
            boundaryWalls: true,
            project: { select: { name: true } }
        }
    });

    console.log(`\n🏠 Re-embedding ${items.length} inventory items...`);
    let success = 0, failed = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const features = [
            item.gatedColony ? "Gated Colony" : "",
            item.corner ? "Corner Plot" : "",
            item.construction ? "With Construction" : "",
            item.boundaryWalls ? "Boundary Walls" : "",
        ].filter(Boolean).join(", ");

        const textToEmbed = `
            Type: ${item.propertyType}
            Plot: ${item.plotNumber}
            Size: ${item.size || "N/A"}
            Price: ${item.totalPrice || item.askingPrice || "N/A"}
            Location: ${item.project?.name || "Unknown Project"}
            Features: ${features}
            Description: ${item.description || ""}
            Condition: ${item.condition}
        `.trim().replace(/\s+/g, " ");

        const embedding = await generateEmbedding(textToEmbed);
        if (embedding) {
            await prisma.inventoryItem.update({
                where: { id: item.id },
                data: { descriptionEmbedding: embedding }
            });
            success++;
        } else {
            failed++;
        }

        if ((i + 1) % 10 === 0) {
            process.stdout.write(`  Progress: ${i + 1}/${items.length}\r`);
            await sleep(500);
        }
    }
    console.log(`  ✅ Inventory: ${success} updated, ${failed} failed`);
}

// ------- MAIN -------
async function main() {
    console.log("🔄 Re-generating all embeddings with gemini-embedding-001 (3072 dims)...");
    console.log("   Make sure you've updated Atlas vector indexes to 3072 dimensions first!\n");

    await regenLeads();
    await regenProjects();
    await regenInventory();

    console.log("\n✨ All done! Embeddings regenerated.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
