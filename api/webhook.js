/**
 * Extract user data from WhatsApp Cloud API payload
 */
function extractWhatsAppData(payload) {
  const msg = payload.messages?.[0];

  let type = "text";
  let text = "";
  let messageId = "";

  if (msg) {
    messageId = msg.id;
    if (msg.type === "text") {
      text = msg.text.body;
    } else if (msg.type === "image") {
      type = "image";
      text = "[IMAGE_UPLOAD]"; // Placeholder for text-based agents
      // You would typically extract msg.image.id here to download it later
    } else {
      text = "[UNKNOWN_ATTACHMENT]";
    }
  }

  return {
    waId: payload.contact.wa_id,
    userMessage: text,
    messageType: type, // New field for agents to use
    firstName: payload.contact.name?.split(" ")[0] || null,
    lastName: null,
  };
}
