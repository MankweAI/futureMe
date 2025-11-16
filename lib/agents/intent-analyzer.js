// lib/agents/intent-analyzer.js
// --- NO OPENAI REQUIRED ---

/**
 * Analyzes the user's message to determine their intent using simple rules.
 * This file replaces the AI-based version.
 * @param {string} userMessage The last message from the user.
 * @param {Array} history The conversation history (ignored).
 * @returns {Promise<string>} The determined intent.
 */
async function analyzeIntent(userMessage, history = []) {
  const msg = userMessage.trim().toLowerCase();

  // --- Main Menu Commands (for menu-agent) ---
  // These are for a user who is ALREADY on the waitlist.

  // "1. Share an Idea"
  if (msg.includes("idea") || msg === "1") {
    return "share_idea";
  }

  // "2. Delete My Profile"
  if (msg.includes("delete") || msg === "2") {
    return "delete_profile";
  }

  // Confirmation for deletion
  if (msg === "yes delete") {
    return "delete_profile";
  }

  // --- Onboarding Commands (for onboarding-agent) ---
  // "1. I Agree & Join"
  if (msg.includes("agree") || msg === "1") {
    return "create_profile";
  }

  // --- General Status Check / Greeting ---
  // This is the default for "Hi", "Hello", "Menu", etc.
  // The brain-agent.js will use the user's DB status to decide
  // if this is a "new user" (sends to onboarding) or
  // a "returning user" (sends to menu).
  if (msg === "menu" || msg === "hi" || msg === "hello") {
    return "check_status";
  }

  // --- Fallback for unknown text (like a name, age, etc.) ---
  // 'check_status' is the safest, most neutral intent.
  // The state machine in the active agent (onboarding or menu)
  // will handle this as a reply to its last question.
  return "check_status";
}

module.exports = { analyzeIntent };
