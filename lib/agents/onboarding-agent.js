// lib/agents/onboarding-agent.js
const { getSupabaseClient } = require("../config/database");

// --- NEW "MINIMUM VIABLE PROFILE" STAGES ---
const STAGES = {
  START: "START",
  AWAIT_AGE: "AWAIT_AGE",
  AWAIT_GENDER: "AWAIT_GENDER",
  AWAIT_INTENT: "AWAIT_INTENT",
  COMPLETE: "COMPLETE",
};

class OnboardingAgent {
  constructor() {
    this.agentName = "onboarding_agent";
  }

  async processMessage(userMessage, session, userStatus) {
    const waId = session.wa_id || session.user_id;
    const supabase = getSupabaseClient();

    // 1. Get or create the user's profile row
    let { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("wa_id", waId)
      .single();

    if (error && error.code === "PGRST116") {
      // Row not found
      let { data: newProfile, error: insertError } = await supabase
        .from("user_profiles")
        .insert({
          wa_id: waId,
          status: "onboarding_started",
          profile_data: {
            current_stage: STAGES.START,
            progressive_stage: "awaiting_vision",
          },
        })
        .select()
        .single();

      if (insertError) {
        /* ... error handling ... */
      }
      profile = newProfile;
    } else if (error) {
      /* ... error handling ... */
    }

    // 2. Run the State Machine
    let currentStage = profile.profile_data.current_stage || STAGES.START;
    let response;
    let nextStage = currentStage;
    let profileData = profile.profile_data;

    if (currentStage === STAGES.START) {
      // This is the "Sell the Why" Welcome Message
      response =
        "Welcome to Christ Connect! 🙏✨\n\nWe're building a safe, Christ-centered community for believers to find:\n\n🙏 Prayer Partners\n🤝 Fellowship & Friends\n💛 Meaningful Connections\n\nWe're so excited you're here! This week, we're getting your profile ready, and on **Nov 24th**, your journey begins! 🚀\n\nLet's start with a few quick questions.\n\nFirst, what’s your first name? 🌿";
      nextStage = STAGES.AWAIT_AGE;
    }

    // --- Subsequent Steps ---
    else {
      const lastStage = profile.profile_data.current_stage;

      switch (lastStage) {
        // --- Step 2: AWAIT_AGE ---
        case STAGES.AWAIT_AGE:
          profileData.name = userMessage.trim();
          response = `Awesome, ${profileData.name}! 👋\n\nHow old are you? (Enter the number, e.g., 24) 🎂`;
          nextStage = STAGES.AWAIT_GENDER;
          break;

        // --- Step 3: AWAIT_GENDER ---
        case STAGES.AWAIT_GENDER:
          const age = parseInt(userMessage.trim(), 10);
          if (isNaN(age) || age < 18 || age > 99) {
            return "Please enter a valid age as a number (e.g., 24). We require members to be 18 or older.";
          }
          profileData.age = age;
          response = `Got it! 💫\n\nWhat is your gender?\n1️⃣ Male\n2️⃣ Female\n3️⃣ Prefer not to say`;
          nextStage = STAGES.AWAIT_INTENT;
          break;

        // --- Step 4: AWAIT_CONNECTION_INTENT ---
        case STAGES.AWAIT_INTENT:
          const genderChoice = userMessage.trim();
          if (!/^[1-3]$/.test(genderChoice)) {
            return "Please reply with just the number: 1, 2, or 3.";
          }
          profileData.gender = {
            1: "Male",
            2: "Female",
            3: "Prefer not to say",
          }[genderChoice];
          response =
            "Perfect! What kind of connection are you most excited about? 🌱\n\n1️⃣ Prayer Partner 🙏\n2️⃣ Fellowship & Friends 🤝\n3️⃣ Open to Deeper Connections 💛";
          nextStage = STAGES.COMPLETE; // <-- NOW GOES TO COMPLETE
          break;

        // --- Step 5: COMPLETE / Celebration ---
        case STAGES.COMPLETE:
          const intentChoice = userMessage.trim();
          if (!/^[1-3]$/.test(intentChoice)) {
            return "Please reply with just the number: 1, 2, or 3.";
          }
          profileData.intent = {
            1: "Prayer Partner",
            2: "Fellowship & Friends",
            3: "Deeper Connections",
          }[intentChoice];

          // Set the final MVP state
          profileData.current_stage = STAGES.COMPLETE;
          // Set the *starting* state for the nurture flow
          profileData.progressive_stage = "awaiting_vision";

          // Update DB Status for dashboard
          const { error: completeError } = await supabase
            .from("user_profiles")
            .update({
              profile_data: profileData,
              status: "waitlist_completed", // <-- DASHBOARD METRIC
              completed_at: new Date().toISOString(),
            })
            .eq("wa_id", waId);

          if (completeError) {
            /* ... error handling ... */
          }

          // --- Final Celebration Message ---
          return `🎉 Congratulations, ${profileData.name}! Your Christ Connect profile is officially saved.\n\nYou’re now part of our **Founding Members Circle**. 🏆\n\nMatching opens on **Nov 24th**! To find you the *best* matches, we'll send a few more profile questions over the next few days. Keep an eye out! 👀\n\nWe can’t wait to see your first connections! 💫`;
      }
    }

    // 3. Save the new state back to the database
    profileData.current_stage = nextStage;
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ profile_data: profileData })
      .eq("wa_id", waId);

    if (updateError) {
      /* ... error handling ... */
    }

    return response;
  }
}

module.exports = new OnboardingAgent();
