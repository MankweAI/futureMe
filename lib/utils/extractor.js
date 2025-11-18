// lib/utils/extractor.js
const openai = require("../config/openai");

/**
 * Extracts structured data from a natural language response.
 * @param {string} text - The user's messy text response.
 * @param {string} fields - Description of fields to extract (e.g., "age, city, job").
 */
async function extractProfileData(text, fields) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Optimized for speed/cost
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `Extract the following fields: ${fields}. 
          Return ONLY a raw JSON object. 
          If a field is missing, use null.
          Sanitize "city" to be the major South African city/town name.`,
        },
        { role: "user", content: text },
      ],
    });

    // Clean up response in case AI adds markdown code blocks
    const raw = completion.choices[0].message.content
      .replace(/```json|```/g, "")
      .trim();
    return JSON.parse(raw);
  } catch (error) {
    console.error("Extraction error:", error);
    return {}; // Fail gracefully so the bot doesn't crash
  }
}

module.exports = { extractProfileData };
