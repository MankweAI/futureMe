// lib/agents/menu-agent.js
const { getSupabaseClient } = require("../config/database");
const sessionManager = require("../session-manager"); // <-- THIS IS THE FIX

// Define stages for this agent's FSM
const STAGES = {
  MENU: "MENU",
  AWAIT_SUGGESTION: "AWAIT_SUGGESTION",
  AWAIT_DELETE_CONFIRM: "AWAIT_DELETE_CONFIRM",
};

class MenuAgent {
  constructor() {
    this.agentName = "menu_agent";
  }

  async processMessage(userMessage, session, userStatus) {
    const waId = session.wa_id || session.user_id;
    const supabase = getSupabaseClient();

    // Get this agent's state from the main session
    let agentState = session.state.menuAgentState || { stage: STAGES.MENU };
    let response;

    // --- State Machine for Menu ---

    // State 1: Awaiting a suggestion
    if (agentState.stage === STAGES.AWAIT_SUGGESTION) {
      // Save the suggestion
      const { error } = await supabase
        .from("suggestions")
        .insert({ user_wa_id: waId, suggestion_text: userMessage.trim() });

      if (error) {
        console.error("Failed to save suggestion:", error);
        response = "Sorry, I had trouble saving that. Please try again.";
      } else {
        response =
          "Thank you, that's a fantastic idea. We've saved it for the team to review.";
      }
      agentState.stage = STAGES.MENU; // Reset to menu
    }

    // State 2: Awaiting delete confirmation
    else if (agentState.stage === STAGES.AWAIT_DELETE_CONFIRM) {
      if (userMessage.trim().toLowerCase() === "yes delete") {
        // --- CHURN METRIC ---
        const { error } = await supabase
          .from("user_profiles")
          .update({
            status: "deleted",
            deleted_at: new Date().toISOString(),
          })
          .eq("wa_id", waId);

        response =
          "Your profile and data have been permanently deleted. We're sad to see you go.";
        agentState.stage = STAGES.MENU; // Reset
      } else {
        response = "Deletion cancelled. Phew! Your profile is safe.";
        agentState.stage = STAGES.MENU;
      }
    }

    // State 3: Main Menu (Default)
    else {
      // We use the intent from the brain to handle the user's first message
      const intent = session.state.intent;

      switch (intent) {
        case "share_idea":
          response =
            "We're building this *for you*, and your feedback is a gift!\n\nPlease type your suggestion below and send it as a single message.";
          agentState.stage = STAGES.AWAIT_SUGGESTION;
          break;

        case "delete_profile":
          response =
            "We'd be sad to see you go, but we understand. Are you sure you want to permanently delete your profile?\n\nThis cannot be undone. To confirm, please reply with the exact words: `yes delete`";
          agentState.stage = STAGES.AWAIT_DELETE_CONFIRM;
          break;

        case "check_status":
        default:
          // This is the default countdown message
          response =
            "Welcome back! 🙏\n\nWe're hard at work preparing for launch. Matching officially opens in **14 days**!\n\n1️⃣ Share an Idea 💡\n2️⃣ Delete My Profile 🗑️";
          agentState.stage = STAGES.MENU;
          break;
      }
    }

    // Save this agent's state back to the main session
    session.state.menuAgentState = agentState;
    await sessionManager.updateSession(waId, { state: session.state });

    return response;
  }
}

module.exports = new MenuAgent();
