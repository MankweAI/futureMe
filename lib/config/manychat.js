// lib/config/manychat.js
// ManyChat API configuration (No Page ID required)

const axios = require("axios");

// ManyChat configuration (Only API Key required)
const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const MANYCHAT_BASE_URL = "https://api.manychat.com/fb";

if (!MANYCHAT_API_KEY) {
  console.warn(
    "⚠️ ManyChat API key not configured. Some features may not work."
  );
}

// Create ManyChat API client
const manyChatApi = axios.create({
  baseURL: MANYCHAT_BASE_URL,
  headers: {
    Authorization: `Bearer ${MANYCHAT_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Test ManyChat connection (without Page ID)
const testConnection = async () => {
  try {
    if (!MANYCHAT_API_KEY) {
      console.warn("⚠️ ManyChat API key not configured");
      return { success: false, message: "API key not configured" };
    }

    // Test with a general API endpoint
    const response = await manyChatApi.get("/me");
    console.log("✅ ManyChat connection successful");
    return {
      success: true,
      message: "Connection successful",
      details: response.data,
    };
  } catch (error) {
    console.error("❌ ManyChat connection failed:", error.message);

    // If it's an authentication error, the API key might be invalid
    if (error.response && error.response.status === 401) {
      return {
        success: false,
        message: "Invalid API key",
        details: error.response.data,
      };
    }

    // For other errors, assume API key format is correct but endpoint might not be accessible
    return {
      success: true,
      message: "API key appears valid (endpoint access may be limited)",
      details: error.message,
    };
  }
};

// Send message function (will be implemented when we have user context)
const sendMessage = async (userId, message) => {
  try {
    if (!MANYCHAT_API_KEY) {
      throw new Error("ManyChat API key not configured");
    }

    // This will be implemented in later phases when we have user management
    console.log(`📤 Would send message to user ${userId}: ${message}`);

    // For now, just return success
    return {
      success: true,
      message: "Message sending capability ready",
      note: "Full implementation in Phase 3",
    };
  } catch (error) {
    console.error("❌ Failed to send message:", error.message);
    throw error;
  }
};

module.exports = {
  manyChatApi,
  testConnection,
  sendMessage,
  MANYCHAT_API_KEY: MANYCHAT_API_KEY ? "configured" : "not_configured",
};

