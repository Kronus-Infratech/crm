const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates an embedding vector for the given text.
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]|null>} The embedding vector or null if failed.
 */
async function generateEmbedding(text) {
    if (!text || typeof text !== 'string') return null;

    try {
        // Using 'gemini-embedding-001' as verified working
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent(text.replace(/\n/g, " "));
        const embedding = result.embedding.values;
        console.log(`[AI] Generated embedding with dimensions: ${embedding.length}`);
        return embedding;
    } catch (error) {
        console.error("Error generating embedding:", error.message);
        return null;
    }
}

module.exports = { generateEmbedding };
