// test-openai.js
// This loads all keys from .env.local into process.env
require("dotenv").config({ path: ".env.local" });

// We are testing the intent analyzer, which uses the OpenAI config
const { analyzeIntent } = require("./lib/agents/intent-analyzer");

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ CRITICAL_ERROR: Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}

console.log("Attempting to connect to OpenAI via IntentAnalyzer...");

async function testIntentAnalysis() {
  try {
    const testMessage = "I need to find funding for university";
    console.log(`\nTesting with message: "${testMessage}"`);

    const intent = await analyzeIntent(testMessage);

    if (intent && intent !== "unknown") {
      console.log(`✅ OPENAI_SUCCESS: Intent classified as: '${intent}'`);
    } else {
      console.warn(
        `⚠️ OPENAI_WARNING: Intent was 'unknown'. This might be okay, but check your prompt in intent-analyzer.js`
      );
    }
  } catch (error) {
    console.error("\n❌ OPENAI_ERROR: The API call failed.");
    if (error.response) {
      // Handle specific API errors
      console.error(
        `Error ${error.response.status}: ${error.response.data.error.message}`
      );
      if (error.response.status === 401) {
        console.error(
          "FIX: This is an Authentication Error. Check your OPENAI_API_KEY in .env.local"
        );
      } else if (error.response.status === 429) {
        console.error(
          "FIX: This is a Quota Error. Please check your OpenAI account billing."
        );
      }
    } else {
      console.error(error.message);
    }
  }
}

testIntentAnalysis();
