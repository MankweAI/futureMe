// api/send-notifications.js
const { getSupabaseClient } = require("../lib/config/database");
const { sendTemplateMessage } = require("../lib/twilio-service"); // Assuming this exists

// Define the stages for the progressive flow
const PROGRESSIVE_STAGES = {
  AWAIT_VISION: "awaiting_vision",
  AWAIT_DENOMINATION: "awaiting_denomination",
  AWAIT_RHYTHM: "awaiting_rhythm",
  AWAIT_PRAYER_STYLE: "awaiting_prayer_style",
  AWAIT_FELLOWSHIP_INTEREST: "awaiting_fellowship_interest",
  AWAIT_MATCH_GENDER_PREF: "awaiting_match_gender_pref",
  AWAIT_MATCH_AGE_PREF: "awaiting_match_age_pref",
  PROGRESSIVE_COMPLETE: "progressive_complete",
};

// --- TEMPLATE MANAGEMENT ---
// You MUST get these templates approved by Twilio/Meta
// This maps our internal stage name to the approved template name
const TEMPLATE_MAP = {
  [PROGRESSIVE_STAGES.AWAIT_VISION]: "vision_message", // (The "Why" message)
  [PROGRESSIVE_STAGES.AWAIT_DENOMINATION]: "ask_denomination",
  [PROGRESSIVE_STAGES.AWAIT_RHYTHM]: "ask_rhythm",
  [PROGRESSIVE_STAGES.AWAIT_PRAYER_STYLE]: "ask_prayer_style",
  [PROGRESSIVE_STAGES.AWAIT_FELLOWSHIP_INTEREST]: "ask_fellowship_interest",
  [PROGRESSIVE_STAGES.AWAIT_MATCH_GENDER_PREF]: "ask_match_gender",
  [PROGRESSIVE_STAGES.AWAIT_MATCH_AGE_PREF]: "ask_match_age",
};

// This function must match the Vercel CRON job path
module.exports = async (req, res) => {
  console.log("Starting progressive notification job...");
  const supabase = getSupabaseClient();
  const twoDaysAgo = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1. Find users who are on the waitlist, NOT finished, AND haven't been notified recently
  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("wa_id, profile_data")
    .eq("status", "waitlist_completed")
    .neq(
      "profile_data->>progressive_stage",
      PROGRESSIVE_STAGES.PROGRESSIVE_COMPLETE
    )
    .or(`last_notified_at.is.null,last_notified_at.<=${twoDaysAgo}`); // Wait 2 days between pings

  if (error) {
    console.error("Error fetching users for notification:", error);
    return res.status(500).json({ error: "DB error" });
  }

  if (!users || users.length === 0) {
    console.log("No users eligible for progressive onboarding.");
    return res
      .status(200)
      .json({ success: true, sent: 0, message: "No users eligible." });
  }

  // 2. Loop and send ONE message to each eligible user
  let sentCount = 0;
  let errorCount = 0;
  const now = new Date().toISOString();

  for (const user of users) {
    const userName = user.profile_data.name || "Friend";
    const currentStage =
      user.profile_data.progressive_stage || PROGRESSIVE_STAGES.AWAIT_VISION;

    const templateName = TEMPLATE_MAP[currentStage];
    if (!templateName) {
      console.warn(
        `No template found for stage ${currentStage} for user ${user.wa_id}`
      );
      continue; // Skip this user
    }

    // Example: Send the 'vision_message' template
    const result = await sendTemplateMessage(
      user.wa_id,
      templateName, // e.g., 'vision_message'
      { 1: userName } // Variables (e.g., {{1}} = user's name)
    );

    if (result.success) {
      sentCount++;
      // 3. Update their timestamp. We DON'T update their stage here.
      // The menu-agent will update their stage when they REPLY.
      await supabase
        .from("user_profiles")
        .update({ last_notified_at: now })
        .eq("wa_id", user.wa_id);
    } else {
      errorCount++;
    }
  }

  const message = `Progressive job complete. Sent: ${sentCount}, Failed: ${errorCount}.`;
  console.log(message);
  return res
    .status(200)
    .json({ success: true, sent: sentCount, failed: errorCount, message });
};
