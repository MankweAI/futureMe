// lib/agents/menu-agent.js
const { getSupabaseClient } = require("../config/database");
const sessionManager = require("../session-manager");

// --- THE DAILY WALK NAVIGATION STATE MACHINE ---
const MENU_STAGES = {
  HOME: "HOME",
  SUB_CONNECTIONS: "SUB_CONNECTIONS",
  SUB_WAR_ROOM: "SUB_WAR_ROOM",
  SUB_BIBLE_GYM: "SUB_BIBLE_GYM",
  SUB_MANAGE_PROFILE: "SUB_MANAGE_PROFILE",
  CONFIRM_DELETE: "CONFIRM_DELETE",
};

class MenuAgent {
  constructor() {
    this.agentName = "menu_agent";
  }

  async processMessage(userMessage, session, userStatus) {
    const waId = session.wa_id || session.user_id;
    const supabase = getSupabaseClient();

    // Get current state or default to HOME
    let agentState = session.state.menuAgentState || {
      stage: MENU_STAGES.HOME,
    };
    let response = "";
    const msg = userMessage.trim(); // Case-sensitive for some inputs, but usually we lowercase
    const choice = msg.toLowerCase();

    // ============================================================
    // 1. HOME (THE HUB)
    // ============================================================
    if (agentState.stage === MENU_STAGES.HOME) {
      if (choice === "1" || choice.includes("connection")) {
        agentState.stage = MENU_STAGES.SUB_CONNECTIONS;
        response = await this.getConnectionsMenu(waId, supabase);
      } else if (choice === "2" || choice.includes("war")) {
        agentState.stage = MENU_STAGES.SUB_WAR_ROOM;
        response = this.getWarRoomMenu();
      } else if (
        choice === "3" ||
        choice.includes("gym") ||
        choice.includes("quiz")
      ) {
        agentState.stage = MENU_STAGES.SUB_BIBLE_GYM;
        response = this.getBibleGymMenu();
      } else if (
        choice === "4" ||
        choice.includes("manage") ||
        choice.includes("settings")
      ) {
        agentState.stage = MENU_STAGES.SUB_MANAGE_PROFILE;
        response = this.getManageProfileMenu();
      } else {
        // Default / Fallback
        response = this.getMainMenuResponse();
      }
    }

    // ============================================================
    // 2. SUB-MENU: MY CONNECTIONS
    // ============================================================
    else if (agentState.stage === MENU_STAGES.SUB_CONNECTIONS) {
      if (choice === "0" || choice.includes("back")) {
        agentState.stage = MENU_STAGES.HOME;
        response = this.getMainMenuResponse();
      } else if (choice === "1") {
        // View Status / Matches
        // For MVP, we just show the profile card or a static status
        response =
          "🔎 **Search Status**\n\nI am currently scanning for **Matches in SA**. I have viewed potential profiles today but am waiting for the perfect one.\n\n*I'll text you the moment I find a match!*";
      } else if (choice === "2") {
        // Update Criteria
        response =
          "📝 **Update Criteria**\n\nTo change your preferences (Age, Location, Denomination), please use the 'Delete Profile' option in settings and restart for now. (Edit feature coming soon!)";
      } else {
        response = await this.getConnectionsMenu(waId, supabase);
      }
    }

    // ============================================================
    // 3. SUB-MENU: THE WAR ROOM
    // ============================================================
    else if (agentState.stage === MENU_STAGES.SUB_WAR_ROOM) {
      if (choice === "0" || choice.includes("back")) {
        agentState.stage = MENU_STAGES.HOME;
        response = this.getMainMenuResponse();
      } else if (["1", "2", "3"].includes(choice)) {
        // Placeholders for Request, Stand in Gap, Challenge
        response =
          "🚧 **Under Construction**\n\nOur prayer warriors are setting this up. This feature will be live in the next update!\n\n" +
          this.getWarRoomMenu();
      } else {
        response = this.getWarRoomMenu();
      }
    }

    // ============================================================
    // 4. SUB-MENU: BIBLE GYM
    // ============================================================
    else if (agentState.stage === MENU_STAGES.SUB_BIBLE_GYM) {
      if (choice === "0" || choice.includes("back")) {
        agentState.stage = MENU_STAGES.HOME;
        response = this.getMainMenuResponse();
      } else if (["1", "2"].includes(choice)) {
        // Placeholders for Quiz, Trivia
        response =
          "🚧 **Under Construction**\n\nWe are writing the questions! Check back soon.\n\n" +
          this.getBibleGymMenu();
      } else {
        response = this.getBibleGymMenu();
      }
    }

    // ============================================================
    // 5. SUB-MENU: MANAGE PROFILE
    // ============================================================
    else if (agentState.stage === MENU_STAGES.SUB_MANAGE_PROFILE) {
      if (choice === "0" || choice.includes("back")) {
        agentState.stage = MENU_STAGES.HOME;
        response = this.getMainMenuResponse();
      } else if (choice === "1") {
        // View Profile Card
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("profile_data")
          .eq("wa_id", waId)
          .single();
        response =
          this.generateProfileCard(profile.profile_data) +
          "\n\n" +
          this.getManageProfileMenu();
      } else if (choice === "2") {
        response =
          "📸 **Change Photo**\n\nSimply send a new photo to this chat, and I'll update it for you!";
      } else if (choice === "3") {
        // Trigger Delete Flow
        response =
          "⚠️ **Delete Profile?**\n\nThis will remove you from the matching pool and delete your data.\n\nType **'yes delete'** to confirm.";
        agentState.stage = MENU_STAGES.CONFIRM_DELETE;
      } else {
        response = this.getManageProfileMenu();
      }
    }

    // ============================================================
    // 6. DELETE CONFIRMATION
    // ============================================================
    else if (agentState.stage === MENU_STAGES.CONFIRM_DELETE) {
      if (choice.includes("yes delete")) {
        await supabase
          .from("user_profiles")
          .update({ status: "deleted" })
          .eq("wa_id", waId);
        response =
          "Your profile has been deleted. We hope to see you again! 👋";
      } else {
        response = "Deletion cancelled.";
        agentState.stage = MENU_STAGES.SUB_MANAGE_PROFILE;
        response += "\n\n" + this.getManageProfileMenu();
      }
    }

    // Update Session State
    session.state.menuAgentState = agentState;
    await sessionManager.updateSession(waId, { state: session.state });

    return response;
  }

  // --- RESPONSE GENERATORS ---

  getMainMenuResponse() {
    // Dynamic Header (Static for MVP, but ready for DB connection)
    const dailyVerse = "Iron sharpens iron (Prov 27:17)";

    return (
      `🌿 *Grace’s Hub*\n` +
      `_💡 Today: "${dailyVerse}"_\n\n` +
      `1️⃣ *My Connections* 🤝\n` +
      `2️⃣ *The War Room* ⚔️\n` +
      `3️⃣ *Bible Gym* 🧠\n` +
      `4️⃣ *Manage Profile* ⚙️`
    );
  }

  async getConnectionsMenu(waId, supabase) {
    // In future, check for actual matches here
    return (
      `🤝 *My Connections*\n\n` +
      `1️⃣ View Search Status\n` +
      `2️⃣ Update Criteria\n` +
      `0️⃣ Back`
    );
  }

  getWarRoomMenu() {
    return (
      `⚔️ *The War Room*\n\n` +
      `1️⃣ Submit a Request\n` +
      `2️⃣ Stand in the Gap (Pray for others)\n` +
      `3️⃣ Join Prayer Challenge\n` +
      `0️⃣ Back`
    );
  }

  getBibleGymMenu() {
    return (
      `🧠 *Bible Gym*\n\n` + `1️⃣ Daily Quiz\n` + `2️⃣ Bible Trivia\n` + `0️⃣ Back`
    );
  }

  getManageProfileMenu() {
    return (
      `⚙️ *Manage Profile*\n\n` +
      `1️⃣ View Profile Card\n` +
      `2️⃣ Change Photo\n` +
      `3️⃣ Delete Profile\n` +
      `0️⃣ Back`
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
      `👤 *Your Profile Card*\n` +
      `----------------\n` +
      `**Mode:** ${mode}\n` +
      `**Age:** ${p.age || "N/A"}\n` +
      `${details}\n` +
      `----------------`
    );
  }
}

module.exports = new MenuAgent();
