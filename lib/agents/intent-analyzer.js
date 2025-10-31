const openai = require("../config/openai"); // Correctly import the openai client

// --- NEW SYSTEM PROMPT ---
// We've changed this to focus on FutureMe's goals, not education.
const systemPrompt = `
You are an intent classifier for a South African chatbot named "FutureMe".
Your job is to analyze the user's message and determine their primary goal.

The available intents are:
- 'bursary_application': The user wants to find or apply for a bursary or funding.
- 'view_profile': The user is asking to see or edit their personal information.
- 'career_guidance': The user wants career advice, to explore careers, or find learnerships/internships.
- 'greeting': The user is just saying hi, hello, etc.
- 'unknown': The user's intent is unclear or not related to the above tasks.

Today's date is ${new Date().toISOString().split("T")[0]}.
Analyze the last message from the user and output the correct intent.
`;

// --- NEW JSON SCHEMA ---
// This schema forces OpenAI to respond with one of our new intents.
const jsonSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      description: "The user's primary intent.",
      enum: [
        "bursary_application",
        "view_profile",
        "career_guidance",
        "greeting",
        "unknown",
      ],
    },
  },
  required: ["intent"],
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
    // We use the imported 'openai' client directly.
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using a fast and modern model
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      schema: jsonSchema,
    });

    const result = JSON.parse(completion.choices[0].message.content);
    return result.intent || "unknown";
  } catch (error) {
    console.error("Error in IntentAnalyzer:", error);
    return "unknown";
  }
}

module.exports = { analyzeIntent };
