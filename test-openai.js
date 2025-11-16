// test-openai.js
require("dotenv").config({ path: ".env.local" });

// We are testing the Christ Connect intent analyzer
const { analyzeIntent } = require("./lib/agents/intent-analyzer");

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ CRITICAL_ERROR: Missing OPENAI_API_KEY in .env.local");
  process.exit(1);
}

console.log("Attempting to connect to OpenAI via IntentAnalyzer...");

async function testIntentAnalysis() {
  try {
    const testMessage = "Hi"; // This should be a 'create_profile' intent
    const history = []; // Simulating a new user

    console.log(`\nTesting with message: "${testMessage}" (as new user)`);

    const intent = await analyzeIntent(testMessage, history);

    if (intent === "create_profile") {
      console.log(
        `✅ OPENAI_SUCCESS: Intent correctly classified as: '${intent}'`
      );
    } else {
      console.warn(
        `⚠️ OPENAI_WARNING: Intent was '${intent}', expected 'create_profile'. Check your prompt in lib/agents/intent-analyzer.js`
      );
    }

    // Test 2: Returning user
    const testMessage2 = "Menu";
    const history2 = [{ role: "user", content: "..." }]; // Simulating existing user

    console.log(
      `\nTesting with message: "${testMessage2}" (as returning user)`
    );
    const intent2 = await analyzeIntent(testMessage2, history2);

    if (intent2 === "check_status") {
      console.log(
        `✅ OPENAI_SUCCESS: Intent correctly classified as: '${intent2}'`
      );
    } else {
      console.warn(
        `⚠️ OPENAI_WARNING: Intent was '${intent2}', expected 'check_status'. Check your prompt.`
      );
    }
  } catch (error) {
    console.error("\n❌ OPENAI_ERROR: The API call failed.");
    if (error.response) {
      console.error(
        `Error ${error.response.status}: ${error.response.data.error.message}`
      );
    } else {
      console.error(error.message);
    }
  }
}

testIntentAnalysis();
