const path = require("path");
// This path now correctly points to the root .env.local file
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const { OpenAI } = require("openai");

let openai;
if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY not set. OpenAI features will be disabled.");
  // We create a dummy object so the app doesn't crash on require()
  openai = {
    chat: {
      completions: {
        create: async () => {
          console.warn("DUMMY OPENAI RESPONSE: API KEY MISSING");
          return {
            choices: [{ message: { content: '{"intent": "unknown"}' } }],
          };
        },
      },
    },
  };
} else {
  // This is the correct path, where the key is found
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// We export the client directly, as expected by intent-analyzer.js and conversation-agent.js
module.exports = openai;
