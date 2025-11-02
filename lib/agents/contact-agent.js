// lib/agents/contact-agent.js

// --- 1. The Main Navigation Menu (Adapted from conversation-agent.js) ---
const NAVIGATION_MENU = `
━━━━━━━━━━━━━━━━
*Main Menu:*
1️⃣ Bursary Applications
2️⃣ Available Bursaries
3️⃣ My Profile
4️⃣ Contact Us

Reply with a number to return to the menu.`;

// --- 2. Contact Details ---
const CONTACT_DETAILS = `Here are our *Contact Details*:

📧 *Email:* info@ttibursaries.co.za
☎️ *Telephone:* +27 010 746 4366
🌐 *Website:* https://www.ttibursaries.co.za

Our team is available to help you during office hours.`;

class ContactAgent {
  constructor() {
    this.agentName = "contact_us";
  }

  /**
   * Main agent processing function.
   * @param {string} userMessage - The user's message.
   * @param {object} session - The user's session data.
   * @returns {string} The complete WhatsApp response.
   */
  async processMessage(userMessage, session) {
    // 1. Combine the contact details with the navigation menu
    const response = CONTACT_DETAILS + NAVIGATION_MENU;

    // 2. Update session state
    session.state.lastAgent = this.agentName;

    return response;
  }
}

// Export a single instance
module.exports = new ContactAgent();
