// api/webhook.js
// Vercel Serverless Function - Handles BOTH ManyChat & WhatsApp Cloud API
const sessionManager = require("../lib/session-manager");
const brain = require("../lib/agents/brain-agent");

/**
 * Detect payload format (ManyChat vs WhatsApp Cloud API)
 */
function detectPayloadFormat(payload) {
  if (payload.subscriber_id && payload.text) {
    return "manychat";
  }
  if (payload.contact?.wa_id && payload.messages?.[0]?.text) {
    return "whatsapp";
  }
  return "unknown";
}

/**
 * Extract user data from ManyChat payload
 */
function extractManyChatData(payload) {
  return {
    waId: payload.subscriber_id,
    userMessage: payload.text,
    firstName:
      payload.first_name === "{{first_name}}" ? null : payload.first_name,
    lastName: payload.last_name === "{{last_name}}" ? null : payload.last_name,
  };
}

/**
 * Extract user data from WhatsApp Cloud API payload
 */
function extractWhatsAppData(payload) {
  return {
    waId: payload.contact.wa_id,
    userMessage: payload.messages[0].text,
    firstName: payload.contact.name?.split(" ")[0] || null,
    lastName: null,
  };
}

/**
 * Send response in ManyChat format
 */
function sendManyChatResponse(res, message, debugInfo = {}) {
  return res.status(200).json({
    version: "v2",
    content: {
      messages: [{ type: "text", text: message }],
      quick_replies: [],
    },
    debug_info: debugInfo,
  });
}

/**
 * Send response in WhatsApp Cloud API format
 */
function sendWhatsAppResponse(res, message) {
  return res.status(200).json({
    messaging_product: "whatsapp",
    to: "placeholder", // Would come from original message
    text: { body: message },
  });
}

/**
 * Main webhook handler
 */
module.exports = async (req, res) => {
  // 1. Handle OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }

  // 2. Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = req.body;

    // 3. Detect format
    const format = detectPayloadFormat(payload);

    if (format === "unknown") {
      console.warn(
        "⚠️ Invalid payload format:",
        JSON.stringify(payload, null, 2)
      );
      return res.status(400).json({
        error: "Invalid payload format",
        expected: "ManyChat or WhatsApp Cloud API format",
        received: Object.keys(payload),
      });
    }

    // 4. Extract user data based on format
    const userData =
      format === "manychat"
        ? extractManyChatData(payload)
        : extractWhatsAppData(payload);

    const { waId, userMessage, firstName } = userData;

    if (!waId || !userMessage) {
      console.warn("⚠️ Missing required fields:", { waId, userMessage });
      return res.status(400).json({
        error: "Missing wa_id or message text",
        format_detected: format,
      });
    }

    console.log(
      `📥 ${format.toUpperCase()} webhook: wa_id=${waId}, message="${userMessage}"`
    );

    // 5. Get or create session
    const session = await sessionManager.getSession(waId);

    if (!session || !session.history || !session.state) {
      console.error("❌ Failed to create valid session for:", waId);
      const errorMsg =
        "Sorry, we're having trouble starting your session. Please try again.";
      return format === "manychat"
        ? sendManyChatResponse(res, errorMsg)
        : sendWhatsAppResponse(res, errorMsg);
    }

    // 6. Add user message to history
    session.history.push({ role: "user", content: userMessage });

    // 7. Process with brain agent
    console.log(`🧠 Sending to brain agent...`);
    const responseText = await brain.processMessage(userMessage, session);
    console.log(`✅ Brain response: "${responseText.substring(0, 100)}..."`);

    // 8. Send response in correct format
    if (format === "manychat") {
      return sendManyChatResponse(res, responseText, {
        format: "manychat",
        subscriber_id: waId,
        intent: session.state.intent || "unknown",
      });
    } else {
      return sendWhatsAppResponse(res, responseText);
    }
  } catch (error) {
    console.error("❌ WEBHOOK ERROR:", error.message);
    console.error("Stack:", error.stack);

    const errorMsg = "Sorry, something went wrong. Please try again.";

    // Try to detect format from original payload for error response
    const format = detectPayloadFormat(req.body);

    if (format === "manychat") {
      return sendManyChatResponse(res, errorMsg, { error: error.message });
    } else {
      return sendWhatsAppResponse(res, errorMsg);
    }
  }
};
