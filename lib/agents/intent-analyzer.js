const openai = require("../config/openai"); // Correctly import the openai client

// --- NEW SYSTEM PROMPT ---
// We've changed this to focus on TTI Bursaries's goals, not education.
const systemPrompt = `
You are an intent classifier for a South African chatbot named "TTI Bursaries".
Your job is to analyze the user's message and determine their primary goal.

The available intents are:
- 'bursary_application': The user wants to find or apply for a bursary or funding. (Often replies "1")
- 'available_bursaries': The user wants to see a list of available bursaries. (Often replies "2")
- 'view_profile': The user is asking to see or edit their personal information. (Often replies "3")
- 'contact_us': The user wants to see contact details. (Often replies "4")
- 'career_guidance': The user wants career advice, to explore careers, or find learnerships/internships.
- 'greeting': The user is just saying hi, hello, etc.
- 'unknown': The user's intent is unclear or not related to the above tasks.

Today's date is ${new Date().toISOString().split("T")[0]}.
Analyze the last message from the user and output the correct intent.
`;

// --- FIXED JSON SCHEMA ---
const jsonSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      description: "The user's primary intent.",
      enum: [
        "bursary_application",
        "available_bursaries",
        "view_profile",
        "contact_us", // <-- ADDED
        "career_guidance",
        "greeting",
        "unknown",
      ],
    },
  },
  required: ["intent"],
  additionalProperties: false,
};

/**
 * Analyzes the user's message to determine their intent.
 * @param {string} userMessage The last message from the user.
 * @param {Array} history The conversation history.
 * @returns {Promise<string>} The determined intent (e.g., "bursary_application").
 */
async function analyzeIntent(userMessage, history = []) {
  const userContent = `
Conversation History:
${history.map((h) => `${h.role}: ${h.content}`).join("\n")}
---
Last User Message: "${userMessage}"
---
Please classify the intent of the *last user message* based on the context.
`;

  try {
    // --- THIS IS THE CORRECTED API CALL ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intent_classification",
          strict: true,
          schema: jsonSchema,
        },
      },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result.intent || "unknown";
  } catch (error) {
    console.error("Error in IntentAnalyzer:", error);
    return "unknown";
  }
}

module.exports = { analyzeIntent };
