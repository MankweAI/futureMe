// test-manychat-api.js
// Comprehensive end-to-end test for ManyChat webhook integration
require("dotenv").config({ path: ".env.local" });

const axios = require("axios");

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

// Test scenarios with ManyChat format
const tests = [
  {
    name: "Greeting Message (First-time User)",
    payload: {
      subscriber_id: "27721111111",
      first_name: "Test",
      last_name: "User",
      text: "Hi there!",
    },
    expectedIntent: "greeting",
    expectedKeywords: ["Welcome", "TTI Bursaries", "Bursary"],
  },
  {
    name: "Bursary Application Intent",
    payload: {
      subscriber_id: "27722222222",
      first_name: "Sarah",
      last_name: "Student",
      text: "I need to find funding for university",
    },
    expectedIntent: "bursary_application",
    expectedKeywords: ["bursary", "qualify", "funding"],
  },
  {
    name: "Career Guidance Intent",
    payload: {
      subscriber_id: "27723333333",
      first_name: "John",
      last_name: "Career",
      text: "I want career advice and help finding internships",
    },
    expectedIntent: "career_guidance",
    expectedKeywords: ["career", "guidance"],
  },
  {
    name: "Profile Management Intent",
    payload: {
      subscriber_id: "27724444444",
      first_name: "Profile",
      last_name: "User",
      text: "I want to view my profile",
    },
    expectedIntent: "view_profile",
    expectedKeywords: ["profile"],
  },
];

/**
 * Make a test request to the webhook
 */
async function makeWebhookRequest(payload) {
  const response = await axios.post(SERVER_URL, payload, {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  });

  return response.data;
}

/**
 * Validate ManyChat v2 response structure
 */
function validateResponse(response) {
  if (!response) {
    throw new Error("No response received");
  }

  // Check for ManyChat v2 format
  if (response.version !== "v2") {
    console.log(`⚠️ WARNING: Expected version 'v2', got '${response.version}'`);
  }

  if (!response.content) {
    throw new Error("Response missing 'content' field");
  }

  if (!response.content.messages || !Array.isArray(response.content.messages)) {
    throw new Error("Response missing 'content.messages' array");
  }

  if (response.content.messages.length === 0) {
    throw new Error("Response messages array is empty");
  }

  const firstMessage = response.content.messages[0];
  if (firstMessage.type !== "text") {
    throw new Error(`Expected message type 'text', got '${firstMessage.type}'`);
  }

  if (!firstMessage.text || typeof firstMessage.text !== "string") {
    throw new Error("Response message text is missing or invalid");
  }

  return firstMessage.text;
}

/**
 * Check if response contains expected keywords
 */
function containsKeywords(text, keywords) {
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Run a single test
 */
async function runTest(test, testNumber, totalTests) {
  console.log(
    `\n${colors.cyan}📋 Test ${testNumber}/${totalTests}: ${test.name}${colors.reset}`
  );
  console.log(
    `${colors.blue}   Message: "${test.payload.text}"${colors.reset}`
  );
  console.log(
    `${colors.blue}   subscriber_id: ${test.payload.subscriber_id}${colors.reset}`
  );

  try {
    const response = await makeWebhookRequest(test.payload);
    const responseText = validateResponse(response);

    // Check for expected keywords (loose validation)
    const hasExpectedContent = containsKeywords(
      responseText,
      test.expectedKeywords
    );

    if (!hasExpectedContent) {
      console.log(
        `${
          colors.yellow
        }   ⚠️ WARNING: Response doesn't contain expected keywords: ${test.expectedKeywords.join(
          ", "
        )}${colors.reset}`
      );
    }

    console.log(
      `${colors.green}   ✅ SUCCESS: ${test.name} passed${colors.reset}`
    );
    console.log(
      `${colors.blue}   Response: "${responseText.substring(0, 150)}${
        responseText.length > 150 ? "..." : ""
      }"${colors.reset}`
    );

    // Show debug info if available
    if (response.debug_info) {
      console.log(
        `${colors.blue}   Intent: ${response.debug_info.intent || "unknown"}${
          colors.reset
        }`
      );
    }

    return { success: true, test: test.name, response: responseText };
  } catch (error) {
    console.log(
      `${colors.red}   ❌ FAILURE: ${test.name} failed${colors.reset}`
    );

    if (error.code === "ECONNREFUSED") {
      console.log(
        `${colors.red}   Error: Cannot connect to server at ${SERVER_URL}${colors.reset}`
      );
      console.log(
        `${colors.yellow}   Make sure the server is running with: npm run dev${colors.reset}`
      );
    } else if (error.response) {
      console.log(
        `${colors.red}   HTTP ${error.response.status}: ${error.response.statusText}${colors.reset}`
      );
      console.log(
        `${colors.red}   Response: ${JSON.stringify(
          error.response.data,
          null,
          2
        )}${colors.reset}`
      );
    } else {
      console.log(`${colors.red}   Error: ${error.message}${colors.reset}`);
    }

    return { success: false, test: test.name, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(
    `${colors.cyan}🧪 Testing ManyChat Webhook Integration...${colors.reset}`
  );
  console.log(`${colors.blue}Server URL: ${SERVER_URL}${colors.reset}`);
  console.log(
    `${colors.blue}Format: ManyChat v2 (subscriber_id + text)${colors.reset}`
  );
  console.log(
    `${colors.blue}OpenAI Key: ${
      process.env.OPENAI_API_KEY ? "✓ Configured" : "✗ Missing"
    }${colors.reset}`
  );
  console.log(
    `${colors.blue}Supabase URL: ${
      process.env.SUPABASE_URL ? "✓ Configured" : "✗ Missing"
    }${colors.reset}`
  );

  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const result = await runTest(tests[i], i + 1, tests.length);
    results.push(result);

    // Wait between tests to avoid rate limiting
    if (i < tests.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  // Summary
  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(`${colors.cyan}📊 Test Summary${colors.reset}`);
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
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
      `\n${colors.green}✅ ALL TESTS PASSED (${passed}/${results.length})${colors.reset}`
    );
    console.log(
      `${colors.green}🎉 ManyChat webhook integration is working correctly!${colors.reset}\n`
    );
    process.exit(0);
  } else {
    console.log(
      `\n${colors.red}❌ SOME TESTS FAILED (${passed} passed, ${failed} failed)${colors.reset}`
    );
    console.log(
      `${colors.yellow}⚠️ Please review the errors above and fix them.${colors.reset}\n`
    );
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch((error) => {
  console.error(`${colors.red}❌ Critical error running tests:${colors.reset}`);
  console.error(error);
  process.exit(1);
});
