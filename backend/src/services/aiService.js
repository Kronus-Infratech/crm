const { GoogleGenerativeAI } = require("@google/generative-ai");
const prisma = require("../config/database");
const { generateEmbedding } = require("../utils/embedding");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- 1. Define the Schema for the AI (Simplified) ---
// This helps the AI understand the database structure without needing to read the full Prisma schema file every time.
const DB_SCHEMA = {
    User: {
        scalarFields: ["id", "email", "name", "phone", "roles", "department", "designation", "lastLoginAt", "createdAt"],
        // Excluded: password, resetPasswordToken
        relations: ["createdLeads", "assignedLeads", "activities", "transactions"]
    },
    Lead: {
        scalarFields: ["id", "name", "email", "phone", "property", "source", "status", "priority", "budgetFrom", "budgetTo", "followUpDate", "createdAt", "updatedAt", "financeStatus", "ledgerStatus", "feedbackRating", "createdById", "assignedToId", "inventoryItemId"],
        // IMPORTANT: There is NO 'budget' field. Budget is split into 'budgetFrom' (Float) and 'budgetTo' (Float).
        enums: {
            status: ["NEW", "CONTACTED", "INTERESTED", "NOT_INTERESTED", "SITE_VISIT", "NEGOTIATION", "DOCUMENTATION", "CONVERTED", "NOT_CONVERTED"],
            priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            source: ["WEBSITE", "REFERRAL", "INSTAGRAM", "YOUTUBE", "EMAIL", "WHATSAPP", "NINETY_NINE_ACRES", "MAGICBRICKS", "OLX", "COLD_OUTREACH", "WALK_IN"]
        },
        relations: { createdBy: "User (via createdById)", assignedTo: "User (via assignedToId)", inventoryItem: "InventoryItem (via inventoryItemId)", activities: "Activity[]", documents: "Document[]" }
    },
    InventoryItem: {
        scalarFields: ["id", "plotNumber", "size", "ratePerSqYard", "totalPrice", "status", "facing", "roadWidth", "propertyType", "transactionType", "ownerName", "ownerContact", "block", "askingPrice", "condition", "openSides", "construction", "boundaryWalls", "gatedColony", "corner", "soldTo", "soldDate", "description", "listingDate", "projectId", "createdById"],
        enums: {
            status: ["AVAILABLE", "BLOCKED", "SOLD"],
            condition: ["NEW", "RESALE"],
            propertyType: ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "AGRICULTURAL"],
            transactionType: ["SALE", "RENT", "LEASE"]
        },
        // IMPORTANT: 'project' is a RELATION, not a scalar field. Use 'projectId' for groupBy/orderBy/where.
        relations: { project: "Project (via projectId)", leads: "Lead[]", createdBy: "User (via createdById)" },
        notes: "To group by project, use 'projectId' (not 'project'). There is NO 'BOOKED' status — use 'BLOCKED' for reserved items."
    },
    Project: {
        scalarFields: ["id", "name", "location", "description", "cityId"],
        relations: { inventory: "InventoryItem[]", city: "City (via cityId)" }
    },
    Activity: {
        scalarFields: ["id", "type", "title", "description", "date", "createdAt", "userId", "leadId"],
        relations: { user: "User (via userId)", lead: "Lead (via leadId)" }
    },
    Transaction: {
        scalarFields: ["id", "type", "amount", "date", "source", "description", "handledById"],
        relations: { handledBy: "User (via handledById)" }
    },
    Event: {
        scalarFields: ["id", "title", "description", "start", "end", "type", "userId", "leadId"],
        relations: { user: "User (via userId)", lead: "Lead (via leadId)" }
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
                name: "vectorSearch",
                description: "Perform a semantic search to find items based on meaning (e.g., 'spacious villas near park', 'leads looking for luxury flats'). Use this for fuzzy matching or when exact filters are not enough.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        collection: {
                            type: "STRING",
                            description: "The collection to search. Options: 'inventory_items', 'projects', 'leads'."
                        },
                        query: {
                            type: "STRING",
                            description: "The user's search query (e.g., 'luxury apartment in south city')."
                        },
                        limit: {
                            type: "INTEGER",
                            description: "Number of results to return (default 5)."
                        }
                    },
                    required: ["collection", "query"]
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

    vectorSearch: async ({ collection, query, limit = 5 }) => {
        try {
            const embedding = await generateEmbedding(query);
            if (!embedding) return { error: "Failed to generate embedding for query." };

            let modelName = "";
            let path = "";
            let projectStage = {};

            if (collection === "inventory_items") {
                modelName = "inventoryItem";
                path = "descriptionEmbedding";
                projectStage = {
                    plotNumber: 1,
                    size: 1,
                    totalPrice: 1,
                    askingPrice: 1,
                    status: 1,
                    propertyType: 1,
                    condition: 1,
                    description: 1
                };
            } else if (collection === "projects") {
                modelName = "project";
                path = "descriptionEmbedding";
                projectStage = {
                    name: 1,
                    location: 1,
                    description: 1
                };
            } else if (collection === "leads") {
                modelName = "lead";
                path = "notesEmbedding";
                projectStage = {
                    name: 1,
                    status: 1,
                    budgetFrom: 1,
                    budgetTo: 1,
                    property: 1,
                    financeNotes: 1
                };
            } else {
                return { error: "Invalid collection. Use 'inventory_items', 'projects', or 'leads'." };
            }

            // Execute Vector Search using aggregateRaw
            const results = await prisma[modelName].aggregateRaw({
                pipeline: [
                    {
                        $vectorSearch: {
                            index: "vector_index",
                            path: path,
                            queryVector: embedding,
                            numCandidates: 100,
                            limit: limit
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            ...projectStage,
                            score: { $meta: "vectorSearchScore" }
                        }
                    }
                ]
            });

            return results;
        } catch (error) {
            console.error("[AI] Vector Search Error:", error);
            return { error: "Vector search failed. Ensure Atlas Vector Index is configured." };
        }
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

        // --- groupBy sanitization ---
        if (action === "groupBy") {
            // groupBy does not support 'select' — strip it
            if (safeQuery.select) {
                delete safeQuery.select;
            }
            // Ensure _count is present
            if (!safeQuery._count && !safeQuery._sum && !safeQuery._avg && !safeQuery._min && !safeQuery._max) {
                safeQuery._count = true;
            }
            // Fix orderBy: strip any non-aggregate field that's not in `by`
            if (safeQuery.orderBy && safeQuery.by) {
                const bySet = new Set(Array.isArray(safeQuery.by) ? safeQuery.by : [safeQuery.by]);
                const aggregateKeys = new Set(['_count', '_sum', '_avg', '_min', '_max']);
                const fixedOrderBy = {};
                const orderByObj = safeQuery.orderBy;
                for (const [key, val] of Object.entries(orderByObj)) {
                    if (aggregateKeys.has(key)) {
                        fixedOrderBy[key] = val;
                    } else if (bySet.has(key)) {
                        fixedOrderBy[key] = val;
                    }
                    // else: drop it — field not in `by`
                }
                // If nothing survived, default to _count desc
                if (Object.keys(fixedOrderBy).length === 0) {
                    fixedOrderBy._count = { _all: 'desc' };
                }
                safeQuery.orderBy = fixedOrderBy;
            }
        }

        // --- distinct is unreliable with MongoDB — remove it ---
        if (action === "findMany" && safeQuery.distinct) {
            delete safeQuery.distinct;
        }

        // Enforce limit on 'take' for list queries
        if (action === "findMany") {
            if (!safeQuery.take || safeQuery.take > 50) {
                safeQuery.take = 50; // Max limit
            }
        }

        // Fix common AI mistakes: { field: { not: null } } → { NOT: [{ field: null }] }
        if (safeQuery.where) {
            const fixNotNull = (where) => {
                const notNullFields = [];
                for (const [key, val] of Object.entries(where)) {
                    if (val && typeof val === 'object' && !Array.isArray(val) && val.not === null) {
                        notNullFields.push(key);
                    }
                }
                if (notNullFields.length > 0) {
                    for (const field of notNullFields) {
                        delete where[field];
                    }
                    const notConditions = notNullFields.map(f => ({ [f]: null }));
                    if (where.NOT) {
                        if (Array.isArray(where.NOT)) {
                            where.NOT.push(...notConditions);
                        } else {
                            where.NOT = [where.NOT, ...notConditions];
                        }
                    } else {
                        where.NOT = notConditions;
                    }
                }
                return where;
            };
            safeQuery.where = fixNotNull(safeQuery.where);
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

            // --- Validate ObjectID-shaped fields before execution ---
            // Catches AI-invented IDs like "p_green_valley" that would cause Prisma to crash
            const objectIdRegex = /^[0-9a-fA-F]{24}$/;
            const validateIds = (obj, path = '') => {
                if (!obj || typeof obj !== 'object') return null;
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const err = validateIds(item, path);
                        if (err) return err;
                    }
                    return null;
                }
                for (const [key, val] of Object.entries(obj)) {
                    if (typeof val === 'string' && (key === 'id' || key.endsWith('Id')) && val.length > 0) {
                        if (!objectIdRegex.test(val)) {
                            return `Invalid ID value for '${key}': "${val}". IDs must be 24-character hex strings (MongoDB ObjectIDs). Look up the entity by name first to get the real ID.`;
                        }
                    }
                    if (val && typeof val === 'object') {
                        // Skip checking inside 'in' arrays that aren't ID arrays
                        const err = validateIds(val, key);
                        if (err) return err;
                    }
                }
                return null;
            };

            const idError = validateIds(safeQuery);
            if (idError) {
                return { error: idError };
            }

            // Log query for debugging
            const queryKeys = Object.keys(safeQuery);
            if (safeQuery.by) console.log(`  by:`, JSON.stringify(safeQuery.by));
            if (safeQuery.orderBy) console.log(`  orderBy:`, JSON.stringify(safeQuery.orderBy));

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

    ### QUERY SAFETY RULES (MUST FOLLOW)
    1. **Relations vs Scalars:** In \`groupBy\`, \`orderBy\`, and \`where\`, you can ONLY use **scalar fields** (e.g., \`projectId\`), NEVER relation names (e.g., \`project\`). Check the schema's \`scalarFields\` list.
    2. **Enum Values:** ONLY use exact enum values from the schema. For InventoryItem status: AVAILABLE, BLOCKED, SOLD. There is NO 'BOOKED' status.
    3. **groupBy + orderBy:** When using \`groupBy\`, the \`orderBy\` field inside \`_count\` must reference a scalar field that is in the \`by\` array or use \`_all: true\`.
       Example: \`{ by: ['projectId'], orderBy: { _count: { projectId: 'desc' } } }\` ✅
       Wrong:  \`{ by: ['project'], orderBy: { _count: { project: 'desc' } } }\` ❌
    4. **To get project names after groupBy projectId:** First groupBy projectId to get counts, then use a separate findMany on Project with the IDs.
    5. **Field names must be EXACT:** Only use fields listed in \`scalarFields\`. Common mistakes to avoid:
       - Lead has \`budgetFrom\` and \`budgetTo\`, NOT \`budget\`. There is NO \`budget\` field.
       - InventoryItem has \`projectId\`, NOT \`project\` (which is a relation).
       - Always check \`scalarFields\` before writing a select/where clause.
    6. **Filtering for "not null":** NEVER use \`{ field: { not: null } }\`. Instead:
       - Use top-level NOT: \`{ where: { NOT: [{ phone: null }] } }\` ✅
       - Wrong: \`{ where: { phone: { not: null } } }\` ❌ (Prisma rejects \`not: null\`)
       - To check field exists and is set: \`{ where: { NOT: [{ fieldName: null }] } }\`
    7. **IDs are MongoDB ObjectIDs (24-character hex strings like "6789abcd1234ef5678901234").** NEVER invent or guess IDs. If you need a project's ID, first query \`Project.findMany\` with \`{ where: { name: { contains: "...", mode: "insensitive" } }, select: { id: true, name: true } }\` to get the real ID, then use that ID in subsequent queries.
    8. **groupBy queries MUST NOT include \`select\`.** Instead use \`_count: true\` (or \`_count: { fieldName: true }\`) at the top level. 
       Correct example: \`{ by: ['property'], _count: true, orderBy: { _count: { property: 'desc' } }, where: { NOT: [{ property: null }] }, take: 5 }\` ✅
       Wrong: \`{ by: ['property'], select: { _count: { select: { _all: true } }, property: true } }\` ❌
    9. **NEVER use \`distinct\` in findMany.** It does not work reliably with MongoDB. Use \`groupBy\` instead.
       - To get distinct values: \`{ action: 'groupBy', by: ['property'], _count: true }\` ✅
       - Wrong: \`{ action: 'findMany', distinct: ['property'] }\` ❌
    10. **orderBy in groupBy:** Every non-aggregate field in \`orderBy\` must be in the \`by\` array. Only use \`_count\`, \`_sum\`, \`_avg\`, \`_min\`, \`_max\` aggregates in orderBy.

    ### TOOL USAGE
    1. **Check Schema First:** Use \`getDatabaseSchema\` if you are unsure about field names. Look at \`scalarFields\` for queryable columns and \`enums\` for valid values.
    2. **Smart Querying:**
       - **"Show me luxury villas":** Use \`vectorSearch(collection='inventory_items', query='luxury villas')\`.
       - **"Find leads interested in commercial plots":** Use \`vectorSearch(collection='leads', query='commercial plots')\`.
       - **"Count of SOLD items":** Use \`runDatabaseQuery(model='InventoryItem', action='count', query={ where: { status: 'SOLD' } })\`.
       - **"Specific Lead details":** Use \`runDatabaseQuery\` with \`where: { name: ... }\` for exact lookup.
       - **"Most popular project":** Use \`groupBy\` on Lead by \`property\` field, or on InventoryItem by \`projectId\`.
    3. **Combine Tools:** You can run a vector search to find relevant items, then use their IDs to query more details if needed.
    
    ### RESPONSE FORMAT
    - **Direct Answer:** "The most popular project right now is Sunrise City."
    - **The "Why":** "...because it has received 45 inquiries in the last 30 days."
    - **Data Table:** (If applicable)
    - **Insight:** "This suggests a trend towards affordable plots."
`;

const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL,
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

// --- Status messages for each tool ---
const toolStatusMessages = {
    getDatabaseSchema: "understanding data structure",
    vectorSearch: "searching across records",
    runDatabaseQuery: "looking in database",
};

// --- Rotating thinking statuses ---
const thinkingPhases = [
    "thinking",
    "processing your request",
    "analysing data",
    "preparing response",
];

/**
 * Streaming version of generateInsight.
 * Sends SSE events: { type: 'status', message } and { type: 'token', token } and { type: 'done' }
 * @param {string} userMessage
 * @param {Array} history
 * @param {function} sendEvent - (eventType, data) => void
 */
const generateInsightStream = async (userMessage, history = [], sendEvent) => {
    try {
        let cleanHistory = [...history];
        if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
            cleanHistory.shift();
        }

        const chat = model.startChat({
            history: cleanHistory,
            generationConfig: {
                maxOutputTokens: 2000,
            },
        });

        let thinkingIndex = 0;
        const sendThinkingStatus = () => {
            sendEvent('status', thinkingPhases[thinkingIndex % thinkingPhases.length]);
            thinkingIndex++;
        };

        sendThinkingStatus();

        console.log(`[AI Stream] Processing: "${userMessage}"`);

        // First message — non-streaming so we can check for function calls
        let result = await chat.sendMessage(userMessage);
        let response = result.response;
        let calls = response.functionCalls();
        let callCount = 0;

        // If no tool calls needed, stream the answer directly
        if (!calls || calls.length === 0) {
            sendEvent('status', 'composing answer');
            // Re-send via streaming to get real token-by-token output
            // We can't re-send the same message, so just emit the text we have
            const text = response.text();
            sendEvent('token', text);
            sendEvent('done', '');
            console.log(`[AI Stream] Completed with 0 tool passes (no streaming needed).`);
            return;
        }

        // Tool-calling loop — use non-streaming sendMessage for intermediate rounds,
        // then sendMessageStream on the final round to get real token streaming.
        let lastToolParts = null;
        while (calls && calls.length > 0 && callCount < 10) {
            callCount++;
            const toolResults = {};

            for (const call of calls) {
                const handler = toolHandlers[call.name];
                if (handler) {
                    const statusMsg = toolStatusMessages[call.name] || "processing";
                    sendEvent('status', statusMsg);

                    try {
                        const data = await handler(call.args);
                        toolResults[call.name] = data;
                    } catch (toolError) {
                        console.error(`[AI Stream] Tool Error (${call.name}):`, toolError);
                        toolResults[call.name] = { error: "Action failed." };
                    }
                }
            }

            sendEvent('status', 'analysing results');

            const parts = Object.keys(toolResults).map(name => ({
                functionResponse: {
                    name: name,
                    response: { content: toolResults[name] }
                }
            }));

            // Non-streaming to check if more function calls are needed
            const nextResult = await chat.sendMessage(parts);
            response = nextResult.response;
            calls = response.functionCalls();
            lastToolParts = parts;

            if (calls && calls.length > 0) {
                sendThinkingStatus();
            }
        }

        // All tool calls done — now stream the final text answer
        sendEvent('status', 'composing answer');

        // We already have the non-streamed text. Now replay the last tool response
        // with sendMessageStream to get real token-by-token streaming.
        // The chat history already includes the last exchange, so we ask the model
        // to output the same answer but via streaming by sending a nudge.
        try {
            const streamResult = await chat.sendMessageStream(
                "Please provide your complete answer now."
            );

            let hasText = false;
            for await (const chunk of streamResult.stream) {
                try {
                    const text = chunk.text();
                    if (text) {
                        hasText = true;
                        sendEvent('token', text);
                    }
                } catch {
                    // function call parts — ignore
                }
            }

            if (hasText) {
                sendEvent('done', '');
                console.log(`[AI Stream] Completed with ${callCount} tool passes (streamed).`);
                return;
            }
        } catch (streamErr) {
            console.warn(`[AI Stream] Streaming replay failed, falling back:`, streamErr.message);
        }

        // Fallback: emit the text from the non-streamed response
        let finalText = '';
        try {
            finalText = response.text();
        } catch (e) {
            try {
                const candidateParts = response.candidates?.[0]?.content?.parts || [];
                finalText = candidateParts.filter(p => p.text).map(p => p.text).join('');
            } catch { /* exhausted */ }
        }

        if (finalText) {
            sendEvent('token', finalText);
            sendEvent('done', '');
            console.log(`[AI Stream] Completed with ${callCount} tool passes (fallback ${finalText.length} chars).`);
        } else {
            console.error(`[AI Stream] No text after ${callCount} tool passes.`);
            sendEvent('error', "I couldn't generate a response. Please try rephrasing your question.");
        }
    } catch (error) {
        console.error("Gemini Stream API Error:", error);
        if (error.message?.includes("429")) {
            sendEvent('error', "I'm currently receiving too many requests. Please wait a moment.");
        } else {
            sendEvent('error', "I'm having trouble analyzing the data right now. Please try again.");
        }
    }
};

module.exports = {
    generateInsight,
    generateInsightStream,
};
