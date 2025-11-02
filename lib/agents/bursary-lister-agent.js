// lib/agents/bursary-lister-agent.js

// --- 1. Hardcoded Bursary List (Copied from application-agent-mvp.js) ---
const BURSARY_LIST = [
  {
    name: "Siemens Bursary",
    funder: "Siemens South Africa",
    deadline: "31 December 2025",
  },
  {
    name: "Momentum Bursary",
    funder: "Momentum Metropolitan",
    deadline: "15 December 2025",
  },
  {
    name: "Metropolitan Health Bursary",
    funder: "Metropolitan Health Group",
    deadline: "30 November 2025",
  },
  {
    name: "Bureau Veritas Bursary",
    funder: "Bureau Veritas South Africa",
    deadline: "20 December 2025",
  },
  {
    name: "General Financial Aid",
    funder: "TTI Bursaries Fund",
    deadline: "Ongoing",
  },
];

// --- 2. The Main Navigation Menu (Adapted from conversation-agent.js) ---
const NAVIGATION_MENU = `
━━━━━━━━━━━━━━━━
*Main Menu:*
1️⃣ Bursary Applications
2️⃣ Available Bursaries
3️⃣ My Profile
4️⃣ Contact Us

Reply with a number to return to the menu.`;

class BursaryListerAgent {
  constructor() {
    this.agentName = "bursary_lister";
  }

  /**
   * Formats the list of bursaries into a clean WhatsApp message.
   * @returns {string} A formatted string of bursaries.
   */
  formatBursaryList() {
    let listString =
      "Here are the *Available Bursaries* we are currently partnered with:\n\n";

    BURSARY_LIST.forEach((bursary) => {
      listString += `*${bursary.name}*\n`;
      listString += `Funder: ${bursary.funder}\n`;
      listString += `Closes: *${bursary.deadline}*\n\n`;
    });

    return listString;
  }

  /**
   * Main agent processing function.
   * @param {string} userMessage - The user's message (not used in this agent).
   * @param {object} session - The user's session data.
   * @returns {string} The complete WhatsApp response.
   */
  async processMessage(userMessage, session) {
    // 1. Get the formatted list of bursaries
    const bursaryListMessage = this.formatBursaryList();

    // 2. Combine the list with the navigation menu
    const response = bursaryListMessage + NAVIGATION_MENU;

    // 3. Update session state
    session.state.lastAgent = this.agentName;

    return response;
  }
}

// Export a single instance
module.exports = new BursaryListerAgent();
