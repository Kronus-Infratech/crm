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
                budget: true,
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
                    _count: { select: { items: true } }
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
    }
};

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    tools: tools,
});

const generateInsight = async (userMessage, history = []) => {
    try {
        // Gemini requires history to start with a 'user' message.
        // If our history starts with the model's welcome message, we should remove it.
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

        let result = await chat.sendMessage(userMessage);
        let response = result.response;

        // Handle function calls manually for better control
        const calls = response.functionCalls();

        if (calls && calls.length > 0) {
            const toolResults = {};

            for (const call of calls) {
                const handler = toolHandlers[call.name];
                if (handler) {
                    console.log(`AI Calling Tool: ${call.name}`);
                    try {
                        toolResults[call.name] = await handler(call.args);
                    } catch (toolError) {
                        console.error(`Tool Execution Error (${call.name}):`, toolError);
                        toolResults[call.name] = { error: "Failed to fetch data from database." };
                    }
                }
            }

            // Send tool results back to Gemini to finalize the response
            const finalResult = await chat.sendMessage(Object.keys(toolResults).map(name => ({
                functionResponse: {
                    name: name,
                    response: { content: toolResults[name] }
                }
            })));

            return finalResult.response.text();
        }

        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};

module.exports = {
    generateInsight
};
