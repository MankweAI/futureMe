// test-manychat-api.js
// End-to-end test for Christ Connect webhook integration
require("dotenv").config({ path: ".env.local" });

const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const SERVER_URL = "http://localhost:3000/api/webhook";

// --- NEW CHRIST CONNECT TEST SCENARIOS ---
const tests = [
  {
    name: "New User Onboarding (First Message)",
    payload: {
      subscriber_id: "27721111111", // NEW USER
      first_name: "New",
      last_name: "User",
      text: "Hi",
    },
    // We expect the welcome message from the onboarding-agent
    expectedKeywords: ["Welcome to Christ Connect", "I Agree & Join"],
  },
  {
    name: "Returning User (Menu Request)",
    payload: {
      subscriber_id: "27722222222", // RETURNING USER
      first_name: "Returning",
      last_name: "User",
      text: "Menu",
    },
    // We expect the countdown menu from the menu-agent
    expectedKeywords: [
      "Welcome back",
      "Matching officially opens",
      "Share an Idea",
    ],
    // This test requires setup
    setup: async (waId) => {
      console.log(
        `   ${colors.yellow}SETUP: Setting user ${waId} status to 'waitlist_completed'...${colors.reset}`
      );
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
      // Ensure user exists and is on the waitlist
      await supabase
        .from("user_profiles")
        .upsert(
          {
            wa_id: waId,
            status: "waitlist_completed",
            profile_data: { name: "Returning" },
          },
          { onConflict: "wa_id" }
        );
    },
  },
];

async function makeWebhookRequest(payload) {
  const response = await axios.post(SERVER_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
  return response.data;
}

function validateResponse(response) {
  if (!response) throw new Error("No response received");
  if (response.version !== "v2")
    console.log(`⚠️ WARNING: Expected version 'v2', got '${response.version}'`);
  if (!response.content?.messages?.[0]?.text)
    throw new Error("Response missing 'content.messages[0].text'");
  return response.content.messages[0].text;
}

function containsKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.every((keyword) => lowerText.includes(keyword.toLowerCase()));
}

async function runTest(test, testNumber, totalTests) {
  console.log(
    `\n${colors.cyan}📋 Test ${testNumber}/${totalTests}: ${test.name}${colors.reset}`
  );
  console.log(
    `   ${colors.blue}Message: "${test.payload.text}" (User: ${test.payload.subscriber_id})${colors.reset}`
  );

  try {
    // Run setup hook if it exists
    if (test.setup) {
      await test.setup(test.payload.subscriber_id);
    }

    const response = await makeWebhookRequest(test.payload);
    const responseText = validateResponse(response);

    const hasExpectedContent = containsKeywords(
      responseText,
      test.expectedKeywords
    );

    if (!hasExpectedContent) {
      throw new Error(
        `Response did not contain expected keywords: "${test.expectedKeywords.join(
          '", "'
        )}"`
      );
    }

    console.log(
      `   ${colors.green}✅ SUCCESS: ${test.name} passed${colors.reset}`
    );
    console.log(
      `   ${colors.blue}Response: "${responseText.substring(0, 70)}..."${
        colors.reset
      }`
    );
    return { success: true, test: test.name };
  } catch (error) {
    console.log(
      `   ${colors.red}❌ FAILURE: ${test.name} failed${colors.reset}`
    );
    if (error.code === "ECONNREFUSED") {
      console.log(
        `   ${colors.red}Error: Cannot connect to server at ${SERVER_URL}${colors.reset}`
      );
      console.log(
        `   ${colors.yellow}Make sure the server is running with: npm run dev${colors.reset}`
      );
    } else if (error.response) {
      console.log(
        `   ${colors.red}HTTP ${error.response.status}: ${error.response.statusText}${colors.reset}`
      );
    } else {
      console.log(`   ${colors.red}Error: ${error.message}${colors.reset}`);
      console.log(
        `   ${colors.yellow}Response Text: "${error.response?.data?.content?.messages[0]?.text}"${colors.reset}`
      );
    }
    return { success: false, test: test.name, error: error.message };
  }
}

async function runAllTests() {
  console.log(
    `${colors.cyan}🧪 Testing Christ Connect Webhook Integration...${colors.reset}`
  );
  console.log(`${colors.blue}Server URL: ${SERVER_URL}${colors.reset}`);

  // Clean up test data first
  console.log(`${colors.yellow}Cleaning test users...${colors.reset}`);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  await supabase
    .from("user_profiles")
    .delete()
    .in("wa_id", ["27721111111", "277222222İ"]);

  const results = [];
  for (let i = 0; i < tests.length; i++) {
    const result = await runTest(tests[i], i + 1, tests.length);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━ Test Summary ━━━━━━━━━━━━━━━━${colors.reset}`
  );
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((result) => {
    const icon = result.success
      ? `${colors.green}✅${colors.reset}`
      : `${colors.red}❌${colors.reset}`;
    console.log(`${icon} ${result.test}`);
  });

  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  if (failed === 0) {
    console.log(
      `\n${colors.green}✅ ALL TESTS PASSED (${passed}/${results.length})${colors.reset}\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n${colors.red}❌ TESTS FAILED (${passed} passed, ${failed} failed)${colors.reset}\n`
    );
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error(`${colors.red}❌ Critical error running tests:${colors.reset}`);
  console.error(error);
  process.exit(1);
});
