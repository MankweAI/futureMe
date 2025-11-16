// lib/agents/onboarding-agent.js
const { getSupabaseClient } = require("../config/database");

// Define the stages of our FSM (Finite State Machine)
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
          profile_data: { current_stage: STAGES.START },
        })
        .select()
        .single();

      if (insertError) {
        console.error("Failed to create user profile:", insertError);
        return "Sorry, I'm having trouble setting up your profile. Please try again in a moment.";
      }
      profile = newProfile;
    } else if (error) {
      console.error("Failed to get user profile:", error);
      return "Sorry, I'm having a database issue. Please try again in a moment.";
    }

    // 2. Run the State Machine
    let currentStage = profile.profile_data.current_stage || STAGES.START;
    let response;
    let nextStage = currentStage;
    let profileData = profile.profile_data;

    // --- Stage 1: START / Welcome ---
    if (currentStage === STAGES.START) {
      response =
        "Welcome to Christ Connect! 🙏✨\n\nWe're thrilled you're here. This week, we're getting your profile ready, and on **Nov 24th**, your journey begins! 🚀\n\nLet's start by getting to know you. What’s your first name? 🌿";
      nextStage = STAGES.AWAIT_AGE;
    }

    // --- Subsequent Steps ---
    else {
      const lastStage = profile.profile_data.current_stage;

      switch (lastStage) {
        // --- Stage 2: AWAIT_AGE ---
        case STAGES.AWAIT_AGE:
          profileData.name = userMessage.trim();
          response = `Awesome, ${profileData.name}! 👋\n\nHow old are you? (Enter the number, e.g., 24) 🎂`;
          nextStage = STAGES.AWAIT_GENDER;
          break;

        // --- Stage 3: AWAIT_GENDER ---
        case STAGES.AWAIT_GENDER:
          // Validation for real age
          const age = parseInt(userMessage.trim(), 10);
          if (isNaN(age) || age < 18 || age > 99) {
            // 18 is a better minimum
            return "Please enter a valid age as a number (e.g., 24). We require members to be 18 or older.";
          }

          profileData.age = age;
          response = `Got it! 💫\n\nWhat is your gender?\n1️⃣ Male\n2️⃣ Female\n3️⃣ Prefer not to say`;
          nextStage = STAGES.AWAIT_INTENT;
          break;

        // --- Stage 4: AWAIT_CONNECTION_INTENT ---
        case STAGES.AWAIT_INTENT:
          // Add validation for 1, 2, 3
          const genderChoice = userMessage.trim();
          if (!/^[1-3]$/.test(genderChoice)) {
            return "Please reply with just the number: 1, 2, or 3.";
          }
          const genderMap = { 1: "Male", 2: "Female", 3: "Prefer not to say" };
          profileData.gender = genderMap[genderChoice];

          response =
            "Perfect! What kind of connection are you most excited about? 🌱\n\n1️⃣ Prayer Partner 🙏\n2️⃣ Fellowship & Friends 🤝\n3️⃣ Open to Deeper Connections 💛";
          nextStage = STAGES.COMPLETE; // Set to COMPLETE
          break;

        // --- Stage 5: COMPLETE / Celebration ---
        case STAGES.COMPLETE:
          const intentChoice = userMessage.trim();
          if (!/^[1-3]$/.test(intentChoice)) {
            return "Please reply with just the number: 1, 2, or 3.";
          }
          const intentMap = {
            1: "Prayer Partner",
            2: "Fellowship & Friends",
            3: "Deeper Connections",
          };
          profileData.intent = intentMap[intentChoice];
          profileData.current_stage = STAGES.COMPLETE;

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
            console.error("Failed to complete profile:", completeError);
            return "Sorry, I had trouble saving that last step. Could you repeat it?";
          }

          // --- Final Celebration Message ---
          return `🎉 Congratulations, ${profileData.name}! Your Christ Connect profile is officially saved.\n\nYou’re now part of our **Founding Members Circle**. 🏆\n\nMatching opens on **Nov 24th**, and you’ll be among the first to see your prayer and fellowship partners. 🌿\n\nWe can’t wait to see your first connections! 💫\n\n**P.S.** Know a friend who would love this? Feel free to forward them this chat!`;
      }
    }

    // 3. Save the new state back to the database
    profileData.current_stage = nextStage;
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ profile_data: profileData })
      .eq("wa_id", waId);

    if (updateError) {
      console.error("Failed to save profile state:", updateError);
      return "Sorry, I'm having trouble saving your progress. Please try that last message again.";
    }

    return response;
  }
}

module.exports = new OnboardingAgent();
