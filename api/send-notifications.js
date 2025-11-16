// api/send-notifications.js
const { getSupabaseClient } = require("../lib/config/database");
const { sendTemplateMessage } = require("../lib/twilio-service");

// This function must match the Vercel CRON job path
module.exports = async (req, res) => {
  // Optional: Add a 'cron secret' to prevent this from being spammed
  // if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  console.log("Starting notification job...");
  const supabase = getSupabaseClient();
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1. Find all users who are on the waitlist AND haven't been notified in 7 days
  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("wa_id, profile_data")
    .eq("status", "waitlist_completed")
    .or(`last_notified_at.is.null,last_notified_at.<=${sevenDaysAgo}`);

  if (error) {
    console.error("Error fetching users for notification:", error);
    return res.status(500).json({ error: "DB error" });
  }

  if (!users || users.length === 0) {
    console.log("No users eligible for notification.");
    return res
      .status(200)
      .json({ success: true, sent: 0, message: "No users eligible." });
  }

  // 2. Loop and send messages
  let sentCount = 0;
  let errorCount = 0;
  const now = new Date().toISOString();

  for (const user of users) {
    const userName = user.profile_data.name || "Friend";

    // Example: Send the 'weekly_drip' template
    const result = await sendTemplateMessage(
      user.wa_id,
      process.env.TWILIO_TEMPLATE_SID, // or by name, e.g., 'weekly_drip'
      { 1: userName, 2: "14" } // Example variables
    );

    if (result.success) {
      sentCount++;
      // 3. Update their timestamp so we don't spam them
      await supabase
        .from("user_profiles")
        .update({ last_notified_at: now })
        .eq("wa_id", user.wa_id);
    } else {
      errorCount++;
    }
  }

  const message = `Notification job complete. Sent: ${sentCount}, Failed: ${errorCount}.`;
  console.log(message);
  return res
    .status(200)
    .json({ success: true, sent: sentCount, failed: errorCount, message });
};

