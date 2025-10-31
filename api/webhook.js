// api/webhook.js
// Vercel Serverless Function
const sessionManager = require("../lib/session-manager");
const brain = require("../lib/agents/brain-agent");
const { sendManychatResponse } = require("../lib/config/manychat");

/**
 * Main webhook handler for ManyChat
 */
module.exports = async (req, res) => {
  // ✅ NOW THIS IS AN ASYNC FUNCTION

  // 1. Handle Vercel's preflight/warm-up requests
  if (req.method === "OPTIONS") {
    return res.status(200).send("OK");
  }

  // 2. Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const payload = req.body;

    // 3. Validate incoming payload
    const waId = payload.contact?.wa_id;
    const userMessage = payload.messages?.[0]?.text;

    if (!waId || !userMessage) {
      console.warn("Invalid payload received:", payload);
      return res
        .status(400)
        .send("Invalid payload: Missing wa_id or message text.");
    }

    console.log(`📥 Webhook received: wa_id=${waId}, message="${userMessage}"`);

    // 4. Get or create the user's session
    console.log(`🔄 Getting session for wa_id: ${waId}`);
    const session = await sessionManager.getSession(waId);
    console.log(`✅ Session retrieved:`, JSON.stringify(session, null, 2));

    // 5. Check if session exists and has required fields
    if (!session || !session.history || !session.state) {
      console.error("Failed to create valid session for user:", waId);
      return sendManychatResponse(
        res,
        "Sorry, we're having trouble starting your session. Please try again."
      );
    }

    // 6. Add user's message to history
    session.history.push({ role: "user", content: userMessage });

    // 7. Process with brain agent
    console.log(`🧠 Sending to brain agent...`);
    const responseText = await brain.processMessage(userMessage, session);
    console.log(`✅ Brain response: "${responseText}"`);

    // 8. Send the brain's response back to ManyChat
    return sendManychatResponse(res, responseText, session.debugInfo);
  } catch (error) {
    console.error("❌ UNHANDLED ERROR in webhook:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    // Send a generic error message back to the user
    return sendManychatResponse(
      res,
      "Sorry, something went wrong on our side. Please try again in a moment."
    );
  }
};
