// lib/config/openai.js
// OpenAI API configuration for AI Agents First architecture

const OpenAI = require("openai");

let openaiClient = null;

// Initialize OpenAI client (singleton pattern for serverless)
const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OpenAI API key missing");
      throw new Error(
        "OpenAI API key missing. Add OPENAI_API_KEY to your environment variables."
      );
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
};

// Test OpenAI connection
const testConnection = async () => {
  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Test connection - respond with 'AI agents ready'",
        },
      ],
      max_tokens: 10,
    });

    console.log("✅ OpenAI connection successful");
    return {
      success: true,
      message: "AI agents ready",
      response: response.choices[0].message.content,
    };
  } catch (error) {
    console.error("❌ OpenAI connection failed:", error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  getOpenAIClient,
  testConnection,
};
