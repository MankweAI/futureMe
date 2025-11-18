// lib/agents/menu-agent.js
const { getSupabaseClient } = require("../config/database");
const sessionManager = require("../session-manager");

const MENU_STAGES = {
  MENU: "MENU",
  VIEW_PROFILE: "VIEW_PROFILE",
  CONFIRM_DELETE: "CONFIRM_DELETE",
  PRAYER_CHALLENGE_MENU: "PRAYER_CHALLENGE_MENU", // New Stage
};

class MenuAgent {
  constructor() {
    this.agentName = "menu_agent";
  }

  async processMessage(userMessage, session, userStatus) {
    const waId = session.wa_id || session.user_id;
    const supabase = getSupabaseClient();

    // Get current state or default to MENU
    let agentState = session.state.menuAgentState || {
      stage: MENU_STAGES.MENU,
    };
    let response = "";

    // --- MENU LOGIC ---
    const msg = userMessage.trim().toLowerCase();

    // 1. MAIN MENU HANDLER
    if (agentState.stage === MENU_STAGES.MENU) {
      if (msg === "1" || msg.includes("profile")) {
        // 1. VIEW PROFILE
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("profile_data")
          .eq("wa_id", waId)
          .single();

        const p = profile.profile_data;
        response = this.generateProfileCard(p);
        // Stay in MENU stage
      } else if (msg === "2" || msg.includes("delete")) {
        // 2. DELETE
        response =
          "⚠️ **Delete Profile?**\n\nThis will remove you from the matching pool and delete your data.\n\nType **'yes delete'** to confirm.";
        agentState.stage = MENU_STAGES.CONFIRM_DELETE;
      } else if (msg === "4" || msg.includes("challenge")) {
        // 4. PRAYER CHALLENGE (Go to Sub-menu)
        response =
          "🔥 **Prayer Challenge**\n\n" +
          "1️⃣ Create a Prayer Challenge\n" +
          "2️⃣ Join a Prayer Challenge";
        agentState.stage = MENU_STAGES.PRAYER_CHALLENGE_MENU;
      } else if (
        ["3", "5"].includes(msg) ||
        msg.includes("request") ||
        msg.includes("quiz")
      ) {
        // 3 & 5. OTHER COMING SOON FEATURES
        response =
          "Hey, we're still working on this one. Please check the first 2 options.";
      } else {
        // DEFAULT / GREETING
        response = this.getMainMenuResponse();
      }
    }

    // 2. PRAYER CHALLENGE SUB-MENU HANDLER
    else if (agentState.stage === MENU_STAGES.PRAYER_CHALLENGE_MENU) {
      if (msg === "1" || msg.includes("create")) {
        response =
          "Hey, we're still working on this one. Please check the first 2 options.";
        agentState.stage = MENU_STAGES.MENU; // Return to main menu
      } else if (msg === "2" || msg.includes("join")) {
        response =
          "Hey, we're still working on this one. Please check the first 2 options.";
        agentState.stage = MENU_STAGES.MENU; // Return to main menu
      } else {
        // Fallback/Back button
        response = this.getMainMenuResponse();
        agentState.stage = MENU_STAGES.MENU;
      }
    }

    // 3. DELETE CONFIRMATION HANDLER
    else if (agentState.stage === MENU_STAGES.CONFIRM_DELETE) {
      if (msg.includes("yes delete")) {
        await supabase
          .from("user_profiles")
          .update({ status: "deleted" })
          .eq("wa_id", waId);
        response =
          "Your profile has been deleted. We hope to see you again! 👋";
      } else {
        response = "Deletion cancelled.";
        agentState.stage = MENU_STAGES.MENU;
      }
    }

    // Update Session State
    session.state.menuAgentState = agentState;
    await sessionManager.updateSession(waId, { state: session.state });

    return response;
  }

  getMainMenuResponse() {
    return (
      "🏠 *Main Menu*\n\n" +
      "1️⃣ View My Profile 👤\n" +
      "2️⃣ Delete Profile 🗑️\n" +
      "3️⃣ Prayer Requests 🙏\n" +
      "4️⃣ Prayer Challenge 🔥\n" +
      "5️⃣ Bible Quizzes 📖\n\n" +
      "*Matching Status:* 🟢 Active\n" +
      "*(I'll notify you when I find a match!)*"
    );
  }

  generateProfileCard(p) {
    const mode =
      p.intent_mode === "Deeper Connections" ? "💍 Dating" : "🤝 Friends";
    let details = "";

    if (p.intent_mode === "Deeper Connections") {
      details =
        `📍 ${p.city || "SA"}\n` +
        `💼 ${p.job_title || "N/A"}\n` +
        `⛪ ${p.denomination || "General"}\n` +
        `👶 Children: ${p.has_children ? "Yes" : "No"}`;
    } else {
      details =
        `📍 ${p.city || "SA"}\n` +
        `⚽ Interests: ${p.interests || "General"}\n` +
        `👫 Pref: ${p.gender_pref === "mixed" ? "Everyone" : "Same Gender"}`;
    }

    return (
      `👤 *Your Profile Card*\n\n` +
      `**Mode:** ${mode}\n` +
      `**Age:** ${p.age || "N/A"}\n` +
      `----------------\n` +
      `${details}\n` +
      `----------------\n\n` +
      `*To edit, you currently need to delete and restart (Edit feature coming soon).*`
    );
  }
}

module.exports = new MenuAgent();
