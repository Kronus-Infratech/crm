const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the "Tools" (functions AI can call)
const tools = [
    {
        functionDeclarations: [
            {
                name: "getLatestLeads",
                description: "Retrieve the most recent leads from the CRM to analyze trends and interest.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: {
                            type: "NUMBER",
                            description: "Number of leads to fetch (default 10, max 50)."
                        }
                    }
                }
            },
            {
                name: "getInventoryStats",
                description: "Get statistics about property inventory, including sold vs available counts and hot areas.",
                parameters: {
                    type: "OBJECT",
                    properties: {}
                }
            },
            {
                name: "getLeadGrowth",
                description: "Fetch lead count growth over the last 30 days to identify market momentum.",
                parameters: {
                    type: "OBJECT",
                    properties: {}
                }
            },
            {
                name: "getAvailableInventory",
                description: "Fetch all currently available properties and plots to find potential matches for leads.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: {
                            type: "NUMBER",
                            description: "Number of inventory items to fetch (default 20, max 100)."
                        }
                    }
                }
            }
        ]
    }
];

// Implementation of the tools
const toolHandlers = {
    getLatestLeads: async ({ limit = 10 }) => {
        const leads = await prisma.lead.findMany({
            take: Math.min(limit, 50),
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                source: true,
                status: true,
                property: true,
                value: true,
                createdAt: true
            }
        });
        return leads;
    },

    getInventoryStats: async () => {
        const [counts, projects] = await prisma.$transaction([
            prisma.inventoryItem.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),
            prisma.project.findMany({
                select: {
                    name: true,
                    _count: { select: { inventory: true } }
                }
            })
        ]);

        // Also get most interested property from leads (rough proxy for 'hot')
        const hotProperties = await prisma.lead.groupBy({
            by: ["property"],
            _count: { _all: true },
            orderBy: { _count: { property: "desc" } },
            take: 5
        });

        return { counts, projects, hotProperties };
    },

    getLeadGrowth: async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const leads = await prisma.lead.findMany({
            where: { createdAt: { gte: thirtyDaysAgo } },
            select: { createdAt: true }
        });

        return { totalLast30Days: leads.length };
    },

    getAvailableInventory: async ({ limit = 20 }) => {
        const inventory = await prisma.inventoryItem.findMany({
            where: { status: "AVAILABLE" },
            take: Math.min(limit, 100),
            include: {
                project: {
                    select: { name: true, location: true }
                }
            }
        });
        return inventory;
    }
};

const systemInstruction = `
    ### ROLE & OBJECTIVE
    You are the dedicated AI Data Analyst for CRM of Kronus Infratech and Consultants. Your goal is to transform raw business data into actionable intelligence. Do NOT simply list numbers—analyze them to help agents close deals and managers optimize performance. Your tone is professional, proactive, and analytical.

    ### TOOL USAGE PROTOCOL
    1. **Always Verify:** Trigger tools first. Never guess data.
    2. **Pattern Recognition:** After fetching data, automatically look for:
       - **Low-Velocity Sources:** Which lead sources (e.g., MagicBricks) are currently most active?
       - **Demand Gaps:** Which properties have high lead interest but low stock?
       - **Smart Matching (NEW):** When users ask for "matches" or "potential deals," call **getLatestLeads** and **getAvailableInventory**. Manually compare lead budgets (value) against property prices (totalPrice) and property interests against project names.

    ### RESPONSE STRUCTURE
    1. **Direct Answer:** Start with a brief, high-level answer to the user's question.
    2. **Structured Data:** Use **Markdown Tables** for all lists of leads or properties.
    3. **Smart Matches (💡 Potential Deals):** If matching was requested, provide a table mapping Leads to specific Inventory Items based on:
       - **Budget Fit:** Lead budget (value) >= Property price (totalPrice).
       - **Interest Match:** Lead's interested property/project matching the inventory project name.
    4. **AI Intelligence (💡 Critical Insights):** Provide 2-3 bullet points of trends, alerts, or opportunities.

    ### FORMATTING RULES
    - Use **Bold** for metrics, property names, and lead sources.
    - Use Markdown Tables for data.
    - Keep responses concise but information-rich.
`;

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: tools,
    systemInstruction: systemInstruction
});

const generateInsight = async (userMessage, history = []) => {
    try {
        let cleanHistory = [...history];
        if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
            cleanHistory.shift();
        }

        const chat = model.startChat({
            history: cleanHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        console.log(`[AI] Processing request: "${userMessage}"`);
        let result = await chat.sendMessage(userMessage);
        let response = result.response;

        let calls = response.functionCalls();
        console.log(`[AI] Initial function calls:`, calls ? calls.length : 0);

        let callCount = 0;
        while (calls && calls.length > 0 && callCount < 5) {
            callCount++;
            const toolResults = {};

            for (const call of calls) {
                const handler = toolHandlers[call.name];
                if (handler) {
                    console.log(`[AI] Executing tool: ${call.name} with:`, call.args);
                    try {
                        const data = await handler(call.args);
                        toolResults[call.name] = data;
                        console.log(`[AI] Tool ${call.name} returned data.`);
                    } catch (toolError) {
                        console.error(`[AI] Tool Error (${call.name}):`, toolError);
                        toolResults[call.name] = { error: "Database retrieval failed." };
                    }
                } else {
                    console.warn(`[AI] Model called unknown tool: ${call.name}`);
                }
            }

            const parts = Object.keys(toolResults).map(name => ({
                functionResponse: {
                    name: name,
                    response: { content: toolResults[name] }
                }
            }));

            const finalResult = await chat.sendMessage(parts);
            response = finalResult.response;
            calls = response.functionCalls();
            console.log(`[AI] Next function calls:`, calls ? calls.length : 0);
        }

        const finalOutput = response.text();
        console.log(`[AI] Completed with ${callCount} tool passes.`);
        return finalOutput;
    } catch (error) {
        console.error("Gemini API Error:", error);
        if (error.message?.includes("429")) {
            return "I'm currently receiving too many requests. Please wait a moment and try again.";
        }
        if (error.message?.includes("404")) {
            return "The AI service is currently unavailable. Please try again later or contact support.";
        }
        return "I'm sorry, I'm having trouble connecting to my intelligence engine. Please try again in a moment.";
    }
};

module.exports = {
    generateInsight
};
