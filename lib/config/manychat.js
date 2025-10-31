const path = require("path");
// This path now correctly points to the root .env.local file
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const axios = require("axios");

const MANYCHAT_API_KEY = process.env.MANYCHAT_API_KEY;
const MANYCHAT_API_URL =
  process.env.MANYCHAT_API_URL || "https://api.manychat.com";

if (!MANYCHAT_API_KEY) {
  console.warn("MANYCHAT_API_KEY not set. ManyChat features will be disabled.");
}

const manychat = axios.create({
  baseURL: MANYCHAT_API_URL,
  headers: {
    Authorization: `Bearer ${MANYCHAT_API_KEY}`,
    "Content-Type": "application/json",
  },
});

const sendManychatResponse = (res, message, debugInfo) => {
  // Simplified response function
  res.json({
    version: "v2",
    content: {
      messages: [{ type: "text", text: message }],
      quick_replies: [],
    },
    debug_info: debugInfo,
  });
};

module.exports = {
  manychat,
  sendManychatResponse,
};
