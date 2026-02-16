const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. Define the Schema for the AI (Simplified) ---
// This helps the AI understand the database structure without needing to read the full Prisma schema file every time.
const DB_SCHEMA = {
    User: {
        fields: ["id", "email", "name", "phone", "roles", "department", "designation", "lastLoginAt", "createdAt"], 
        // Excluded: password, resetPasswordToken
        relations: ["createdLeads", "assignedLeads", "activities", "transactions"]
    },
    Lead: {
        fields: ["id", "name", "email", "phone", "property", "source", "status", "priority", "budgetFrom", "budgetTo", "followUpDate", "createdAt", "updatedAt", "financeStatus", "ledgerStatus", "feedbackRating"],
        relations: ["createdBy", "assignedTo", "activities", "documents", "inventoryItem"]
    },
    InventoryItem: {
        fields: ["id", "plotNumber", "size", "ratePerSqYard", "totalPrice", "status", "project", "facing", "roadWidth", "propertyType", "transactionType", "ownerName", "block", "askingPrice", "listingDate"],
        relations: ["project", "leads", "createdBy"]
    },
    Project: {
        fields: ["id", "name", "location", "description"],
        relations: ["inventory", "city"]
    },
    Activity: {
        fields: ["id", "type", "title", "description", "date", "createdAt"],
        relations: ["user", "lead"]
    },
    Transaction: {
        fields: ["id", "type", "amount", "date", "source", "description"],
        relations: ["handledBy"]
    },
    Event: {
        fields: ["id", "title", "description", "start", "end", "type"],
        relations: ["user", "lead"]
    }
};

// --- 2. Define Tools ---
const tools = [
    {
        functionDeclarations: [
            {
                name: "getDatabaseSchema",
                description: "Get the structure of the database (models, fields, and relationships). Use this first to understand what data is available.",
                parameters: {
                    type: "OBJECT",
                    properties: {}
                }
            },
            {
                name: "runDatabaseQuery",
                description: "Execute a read-only database query. Use this to fetch data, count records, or aggregate statistics.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        model: {
                            type: "STRING",
                            description: "The name of the model to query (e.g., 'Lead', 'User', 'InventoryItem')."
                        },
                        action: {
                            type: "STRING",
                            description: "The action to perform. Allowed: 'findMany', 'findFirst', 'findUnique', 'count', 'aggregate', 'groupBy'."
                        },
                        query: {
                            type: "OBJECT",
                            description: "The Prisma query object containing 'where', 'select', 'orderBy', 'take', 'skip'. (MAX limit is 50)."
                        }
                    },
                    required: ["model", "action", "query"]
                }
            }
        ]
    }
];

// --- 3. Tool Implementation ---
const toolHandlers = {
    getDatabaseSchema: async () => {
        return DB_SCHEMA;
    },

    runDatabaseQuery: async ({ model, action, query }) => {
        // --- Security & Validation ---
        
        // 1. Validate Model
        const allowedModels = Object.keys(DB_SCHEMA);
        if (!allowedModels.includes(model)) {
            return { error: `Invalid model: ${model}. Allowed models: ${allowedModels.join(", ")}` };
        }

        // 2. Validate Action (Read-Only)
        const allowedActions = ["findMany", "findFirst", "findUnique", "count", "aggregate", "groupBy"];
        if (!allowedActions.includes(action)) {
            return { error: `Invalid action: ${action}. Only read operations are allowed.` };
        }

        // 3. Enforce Limits & Cleanup Query
        const safeQuery = { ...query };

        // Enforce limit on 'take' for list queries
        if (action === "findMany") {
            if (!safeQuery.take || safeQuery.take > 50) {
                safeQuery.take = 50; // Max limit
            }
        }

        // Prevent selecting sensitive fields for User
        if (model === "User" && safeQuery.select) {
            delete safeQuery.select.password;
            delete safeQuery.select.resetPasswordToken;
            delete safeQuery.select.resetPasswordExpire;
        }

        // --- Execution ---
        try {
            // Convert PascalCase (e.g., 'InventoryItem') to camelCase (e.g., 'inventoryItem') for Prisma
            const prismaModelName = model.charAt(0).toLowerCase() + model.slice(1);

            if (!prisma[prismaModelName]) {
                 return { error: `Prisma model '${prismaModelName}' not found.` };
            }

            // e.g., prisma.lead.findMany(query)
            const result = await prisma[prismaModelName][action](safeQuery);

            // Post-processing for safety (redact if select was not used but fields returned)
            if (model === "User" && result) {
                const redactUser = (u) => {
                    if (u) {
                        delete u.password;
                        delete u.resetPasswordToken;
                        delete u.resetPasswordExpire;
                    }
                    return u;
                };

                if (Array.isArray(result)) {
                    result.forEach(redactUser);
                } else {
                    redactUser(result);
                }
            }

            return result;
        } catch (error) {
            console.error(`[AI] Database Query Error (${model}.${action}):`, error.message);
            return { error: `Database query failed: ${error.message}` };
        }
    }
};

// --- 4. System Instruction ---
const systemInstruction = `
    ### ROLE & OBJECTIVE
    You are the **AI Business Analyst** for Kronus Infratech.
    Your goal is to answer questions about sales, inventory, and leads in **plain, professional business language**. 
    **NEVER** use technical terms like "Prisma", "database schema", "query failed", "count of 1", or "ID".
    
    ### CRITICAL RULES
    1.  **Explain "Why":** When you present a list (e.g., "Top Properties"), you **MUST** explain the criteria you used (e.g., "These projects have the highest number of interested leads this month").
    2.  **Infer "Hot" or "Popular":** 
        - "Hot" usually means **Most Leads** (check \`Lead\` table grouped by \`property\`) or **Most Sales** (check \`InventoryItem\` where status is 'SOLD').
        - Do NOT just list random or large properties. Run a query to find the *most popular* ones first.
        - Example: To find hot properties, count leads by 'property' string.
    3.  **Handle Ambiguity Gracefully:** If data is unclear (e.g., no clear popular size), say "Demand is quite varied right now" instead of "The query returned 1 for everything."
    4.  **No Explaining the Tool:** Don't say "I will run a database query." Just say "Let me analyze the current market interest." and do it.

    ### TOOL USAGE
    1. **Check Schema First:** Use \`getDatabaseSchema\` if you are unsure about field names.
    2. **Smart Querying:**
       - **"Hot Properties":** Group leads by \`property\` to see where demand is.
       - **"Sales Performance":** Check \`InventoryItem\` with status='SOLD' or \`Transaction\` table.
    
    ### RESPONSE FORMAT
    - **Direct Answer:** "The most popular project right now is Sunrise City."
    - **The "Why":** "...because it has received 45 inquiries in the last 30 days."
    - **Data Table:** (If applicable)
    - **Insight:** "This suggests a trend towards affordable plots."
`;

const model = genAI.getGenerativeModel({
    // model: "gemini-2.5-pro",
    model: "gemini-3-pro-preview",
    tools: tools,
    systemInstruction: systemInstruction
});

const generateInsight = async (userMessage, history = []) => {
    try {
        let cleanHistory = [...history];
        
        // Remove 'model' role if it's the first message (Gemini API requirement sometimes)
        if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
            cleanHistory.shift();
        }

        const chat = model.startChat({
            history: cleanHistory,
            generationConfig: {
                maxOutputTokens: 2000, // Increased for larger data responses
            },
        });

        console.log(`[AI] Processing request: "${userMessage}"`);
        let result = await chat.sendMessage(userMessage);
        let response = result.response;

        let calls = response.functionCalls();
        console.log(`[AI] Initial function calls:`, calls ? calls.length : 0);

        let callCount = 0;
        // Allow up to 10 generic tool calls for complex reasoning chains
        while (calls && calls.length > 0 && callCount < 10) {
            callCount++;
            const toolResults = {};

            for (const call of calls) {
                const handler = toolHandlers[call.name];
                if (handler) {
                    console.log(`[AI] Executing tool: ${call.name}`);
                    try {
                        const data = await handler(call.args);
                        toolResults[call.name] = data;
                        // console.log(`[AI] Tool ${call.name} returned data:`, JSON.stringify(data).substring(0, 100) + "...");
                    } catch (toolError) {
                        console.error(`[AI] Tool Error (${call.name}):`, toolError);
                        toolResults[call.name] = { error: "Action failed." };
                    }
                } else {
                    console.warn(`[AI] Unknown tool: ${call.name}`);
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
            return "I'm currently receiving too many requests. Please wait a moment.";
        }
        return "I'm having trouble analyzing the data right now. Please try again.";
    }
};

module.exports = {
    generateInsight
};
