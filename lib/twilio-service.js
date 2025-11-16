// lib/twilio-service.js
// This file assumes you are using Twilio as your provider
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

const client = require("twilio")(accountSid, authToken);

/**
 * Sends a pre-approved WhatsApp Template message.
 * @param {string} to - The user's WhatsApp ID (e.g., 'whatsapp:+27721234567')
 * @param {string} templateName - The name of the approved template (e.g., 'weekly_drip')
 * @param {object} variables - The variables for the template (e.g., { '1': 'Tasi', '2': '7' })
 */
async function sendTemplateMessage(to, templateName, variables) {
  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio not configured. Skipping notification.");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    // Note: Twilio needs 'whatsapp:+...' prefix
    const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const msg = await client.messages.create({
      from: fromNumber,
      to: toFormatted,
      // This 'content' key is how Twilio handles templates
      contentSid: templateName, // Use this if you have a Content SID
      // OR for some newer APIs:
      // content: {
      //   type: 'whatsapp/template',
      //   template: {
      //     name: templateName,
      //     language: 'en',
      //     variables: variables
      //   }
      // }
      // Check your specific Twilio API version.
      // The 'body' method from your file is for *replies*, not templates.
    });

    return { success: true, sid: msg.sid };
  } catch (error) {
    console.error(`Failed to send template to ${to}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendTemplateMessage };
