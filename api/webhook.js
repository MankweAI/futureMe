// Vercel Serverless Function
const sessionManager = require("../lib/session-manager");
const brain = require("../lib/agents/brain-agent");
const { sendManychatResponse } = require("../lib/config/manychat");

/**
 * Main webhook handler for ManyChat
 */
module.exports = async (req, res) => {
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

    // 4. Get or create the user's session
    const session = await sessionManager.getSession(waId);

    // 5. Add user's message to history
    session.history.push({ role: "user", content: userMessage });

    // 6. --- NEW LOGIC ---
    // Immediately delegate to the brain agent to process the message.
    // The brain will now handle greetings, intent analysis, and routing
    // for ALL messages, including the first one.
    const responseText = await brain.processMessage(userMessage, session);

    // 7. Send the brain's response back to ManyChat
    return sendManychatResponse(res, responseText, session.debugInfo);
  } catch (error) {
    console.error("Unhandled error in webhook:", error);

    // Send a generic error message back to the user
    return sendManychatResponse(
      res,
      "Sorry, something went wrong on our side. Please try again in a moment."
    );
  }
};
