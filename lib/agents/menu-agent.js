// lib/agents/menu-agent.js
const { getSupabaseClient } = require("../config/database");
const sessionManager = require("../session-manager");

// --- STAGES FOR THE MAIN MENU FSM ---
const MENU_STAGES = {
  MENU: "MENU",
  AWAIT_SUGGESTION: "AWAIT_SUGGESTION",
  AWAIT_DELETE_CONFIRM: "AWAIT_DELETE_CONFIRM",
};

// --- STAGES FOR THE PROGRESSIVE ONBOARDING FSM ---
const PROGRESSIVE_STAGES = {
  AWAIT_VISION: "awaiting_vision", // Set by onboarding-agent
  AWAIT_DENOMINATION: "awaiting_denomination",
  AWAIT_RHYTHM: "awaiting_rhythm",
  AWAIT_PRAYER_STYLE: "awaiting_prayer_style",
  AWAIT_FELLOWSHIP_INTEREST: "awaiting_fellowship_interest",
  AWAIT_MATCH_GENDER_PREF: "awaiting_match_gender_pref",
  AWAIT_MATCH_AGE_PREF: "awaiting_match_age_pref",
  PROGRESSIVE_COMPLETE: "progressive_complete",
};

class MenuAgent {
  constructor() {
    this.agentName = "menu_agent";
  }

  async processMessage(userMessage, session, userStatus) {
    const waId = session.wa_id || session.user_id;
    const supabase = getSupabaseClient();

    // Get this agent's state from the main session
    let agentState = session.state.menuAgentState || {
      stage: MENU_STAGES.MENU,
    };
    let response;

    // --- Get the user's progressive profile state ---
    let { data: profile, error } = await supabase
      .from("user_profiles")
      .select("profile_data")
      .eq("wa_id", waId)
      .single();

    if (error) {
      return "Sorry, I'm having trouble loading your profile. Please try again.";
    }

    let profileData = profile.profile_data;
    let p_stage = profileData.progressive_stage;

    // ---
    // --- 1. PROGRESSIVE ONBOARDING FSM ---
    // ---
    // Check if we are in the middle of the progressive flow.
    // This flow is triggered by the notification bot, and this agent handles the REPLIES.

    const msg = userMessage.trim();

    // Check if the message is a menu command. If so, it overrides the progressive flow.
    const isMenuCommand =
      /^(menu|idea|delete|help)$/i.test(msg) ||
      agentState.stage !== MENU_STAGES.MENU;

    if (
      p_stage &&
      p_stage !== PROGRESSIVE_STAGES.PROGRESSIVE_COMPLETE &&
      !isMenuCommand
    ) {
      switch (p_stage) {
        case PROGRESSIVE_STAGES.AWAIT_DENOMINATION:
          profileData.denomination = msg;
          profileData.progressive_stage = PROGRESSIVE_STAGES.AWAIT_RHYTHM;
          response =
            "Got it! And what's your spiritual rhythm like?\n\n1️⃣ Daily devotions\n2️⃣ Weekly church-goer\n3️⃣ Finding my rhythm\n4️⃣ It's complicated";
          break;

        case PROGRESSIVE_STAGES.AWAIT_RHYTHM:
          profileData.rhythm = msg;
          // Branching logic
          if (profileData.intent === "Prayer Partner") {
            profileData.progressive_stage =
              PROGRESSIVE_STAGES.AWAIT_PRAYER_STYLE;
            response =
              "What's your preferred prayer style?\n\n1️⃣ Structured\n2️⃣ Conversational\n3️⃣ Contemplative\n4️⃣ Open to all";
          } else if (profileData.intent === "Fellowship & Friends") {
            profileData.progressive_stage =
              PROGRESSIVE_STAGES.AWAIT_FELLOWSHIP_INTEREST;
            response =
              "What's your ideal fellowship?\n\n1️⃣ Bible study\n2️⃣ Coffee & chat\n3️⃣ Outdoor activities\n4️⃣ Serving";
          } else {
            profileData.progressive_stage =
              PROGRESSIVE_STAGES.AWAIT_MATCH_GENDER_PREF;
            response =
              "Great. Now for your preferences. Which gender?\n1️⃣ Men only\n2️⃣ Women only\n3️⃣ No preference";
          }
          break;

        // ... other cases ...

        case PROGRESSIVE_STAGES.AWAIT_MATCH_GENDER_PREF:
          // Save the data from the previous step
          if (profileData.intent === "Prayer Partner")
            profileData.prayer_style = msg;
          else if (profileData.intent === "Fellowship & Friends")
            profileData.fellowship_interest = msg;

          profileData.progressive_stage =
            PROGRESSIVE_STAGES.AWAIT_MATCH_AGE_PREF;
          response =
            "And what age range for connections?\n\n1️⃣ 18-25\n2️⃣ 26-35\n3️⃣ 36-45\n4️⃣ 46+\n5️⃣ Open to all ages";
          break;

        case PROGRESSIVE_STAGES.AWAIT_MATCH_AGE_PREF:
          profileData.match_gender_pref = msg; // This was the gender pref
          profileData.progressive_stage =
            PROGRESSIVE_STAGES.PROGRESSIVE_COMPLETE; // All done!
          profileData.match_age_pref = userMessage.trim(); // This is the age pref
          response =
            "Perfect! ✨ Your matching profile is now 100% complete. We have everything we need to find you the most aligned connections on Nov 24th!";
          break;

        default:
          // User is in a progressive state but we don't know which one.
          // Or they replied to the "Vision" message, which needs no reply.
          // We'll just ignore it and let the notification bot re-trigger the next question.
          agentState.stage = MENU_STAGES.MENU; // Reset to menu
          return this.getMainMenuResponse(); // Show the main menu
      }

      // If we are here, we processed a progressive step. Save and return.
      await supabase
        .from("user_profiles")
        .update({ profile_data: profileData })
        .eq("wa_id", waId);
      return response;
    }

    // ---
    // --- 2. MAIN MENU FSM ---
    // ---
    // If we're not in the progressive flow, handle the menu commands.

    // State 1: Awaiting a suggestion
    if (agentState.stage === STAGES.AWAIT_SUGGESTION) {
      // Save the suggestion
      await supabase
        .from("suggestions")
        .insert({ user_wa_id: waId, suggestion_text: msg });
      response =
        "Thank you, that's a fantastic idea. We've saved it for the team to review.";
      agentState.stage = MENU_STAGES.MENU; // Reset to menu
    }

    // State 2: Awaiting delete confirmation
    else if (agentState.stage === STAGES.AWAIT_DELETE_CONFIRM) {
      if (msg.toLowerCase() === "yes delete") {
        await supabase
          .from("user_profiles")
          .update({ status: "deleted", deleted_at: new Date().toISOString() })
          .eq("wa_id", waId);
        response =
          "Your profile and data have been permanently deleted. We're sad to see you go.";
      } else {
        response = "Deletion cancelled. Phew! Your profile is safe.";
      }
      agentState.stage = MENU_STAGES.MENU;
    }

    // State 3: Main Menu (Default)
    else {
      // Use the intent from the brain to handle the user's first message
      const intent = session.state.intent;

      switch (intent) {
        case "share_idea":
          response =
            "We're building this *for you*, and your feedback is a gift!\n\nPlease type your suggestion below and send it as a single message.";
          agentState.stage = MENU_STAGES.AWAIT_SUGGESTION;
          break;

        case "delete_profile":
          response =
            "We'd be sad to see you go, but we understand. Are you sure you want to permanently delete your profile?\n\nThis cannot be undone. To confirm, please reply with the exact words: `yes delete`";
          agentState.stage = MENU_STAGES.AWAIT_DELETE_CONFIRM;
          break;

        case "check_status":
        default:
          response = this.getMainMenuResponse();
          agentState.stage = MENU_STAGES.MENU;
          break;
      }
    }

    // Save this agent's state back to the main session
    session.state.menuAgentState = agentState;
    await sessionManager.updateSession(waId, { state: session.state });

    return response;
  }

  getMainMenuResponse() {
    return "Welcome back! 🙏\n\nWe're hard at work preparing for launch. Matching officially opens on **Nov 24th**!\n\n1️⃣ Share an Idea 💡\n2️⃣ Delete My Profile 🗑️";
  }
}

module.exports = new MenuAgent();
