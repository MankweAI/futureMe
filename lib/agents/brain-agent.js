// lib/agents/brain-agent.js
const intentAnalyzer = require("./intent-analyzer");
const sessionManager = require("../session-manager");
const { getSupabaseClient } = require("../config/database");

// --- Import our NEW agents ---
const onboardingAgent = require("./onboarding-agent");
const menuAgent = require("./menu-agent");

/**
 * Fetches the user's status from the database.
 * This check is crucial for routing.
 */
async function getUserStatus(waId) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("status")
      .eq("wa_id", waId)
      .single();

    if (error && error.code !== "PGRST116") {
      // 'PGRST116' = row not found
      throw error;
    }

    return data ? data.status : null; // null = user does not exist
  } catch (error) {
    console.error("Error fetching user status:", error);
    return null; // Fail-safe
  }
}

/**
 * Routes to the correct agent based on intent AND user status.
 */
function determineTargetAgent(intent, userStatus, session) {
  // 1. Handle new user (or user who started but didn't finish)
  if (userStatus === null || userStatus === "onboarding_started") {
    return onboardingAgent;
  }

  // 2. Handle a returning, waitlisted user
  if (userStatus === "waitlist_completed") {
    // The menu agent can handle all returning user intents
    return menuAgent;
  }

  // 3. Handle a user who deleted their profile
  if (userStatus === "deleted") {
    return {
      agentName: "deleted_user_agent",
      processMessage: async () =>
        "You have previously deleted your profile. To re-join, please contact support.",
    };
  }

  // 4. Fallback
  return onboardingAgent;
}

async function processMessage(userMessage, session) {
  const waId = session.wa_id || session.user_id;

  // 1. Get the user's *true* status from our database
  const userStatus = await getUserStatus(waId);

  // 2. Analyze intent
  const intent = await intentAnalyzer.analyzeIntent(
    userMessage,
    session.history
  );
  session.state.intent = intent;

  // 3. Determine target agent based on STATUS
  const targetAgent = determineTargetAgent(intent, userStatus, session);
  session.state.lastAgent = targetAgent.agentName || "brain";

  // 4. Delegate to target agent
  const response = await targetAgent.processMessage(
    userMessage,
    session,
    userStatus
  );

  // 5. Update session
  session.history.push({ role: "assistant", content: response });
  await sessionManager.updateSession(waId, {
    history: session.history,
    state: session.state,
  });

  return response;
}

module.exports = {
  processMessage,
  agentName: "brain",
};
