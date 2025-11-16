// lib/agents/onboarding-agent.js
const { getSupabaseClient } = require("../config/database");

// Define the stages of our FSM (Finite State Machine)
const STAGES = {
  START: "START",
  AWAIT_NAME: "AWAIT_NAME",
  AWAIT_AGE_RANGE: "AWAIT_AGE_RANGE",
  AWAIT_GENDER: "AWAIT_GENDER",
  AWAIT_INTENT: "AWAIT_INTENT",
  // ... add all other profile fields from handover doc
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
    // This is where we log 'onboarding_started' for the dashboard
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

    // --- Welcome Message ---
    if (currentStage === STAGES.START) {
      response =
        "Welcome to Christ Connect! 🙏\n\nWe're building a safe, Christ-centered platform for believers to find prayer partners, fellowship, and meaningful connections.\n\nWe are currently in our **Early Access** phase. By signing up now, you'll be part of our founding community and get **priority matching** when we go live in 14 days.\n\nTo ensure a safe and respectful community, please confirm you agree to our **Code of Conduct** (our guide for Christ-like interaction).\n\n1️⃣ I Agree & Join\n2️⃣ No Thanks";
      nextStage = STAGES.AWAIT_NAME; // We'll ask for name next
    }

    // --- Subsequent Steps ---
    // This is a simplified FSM. You will expand this for all questions.
    else {
      const lastStage = profile.profile_data.current_stage;

      switch (lastStage) {
        case STAGES.AWAIT_NAME:
          if (!/^(1|2)$/.test(userMessage.trim())) {
            return "Please reply with '1' to agree or '2' if you don't wish to continue.";
          }
          if (userMessage.trim() === "2") {
            return "No problem. We understand. Let us know if you change your mind!";
            // We leave their status as 'onboarding_started' - they are now a "drop-off" metric
          }

          profileData.agreed_at = new Date().toISOString();
          response =
            "Wonderful. Let's create your profile so we can have you ready for matching.\n\nFirst, what's the best name to call you?";
          nextStage = STAGES.AWAIT_AGE_RANGE;
          break;

        case STAGES.AWAIT_AGE_RANGE:
          profileData.name = userMessage.trim();
          response = `Thanks, ${profileData.name}!\n\nWhat is your age range?\n\n1️⃣ 18-24\n2️⃣ 25-34\n3️⃣ 35-44\n4️⃣ 45+`;
          nextStage = STAGES.AWAIT_GENDER;
          break;

        case STAGES.AWAIT_GENDER:
          // Add validation here
          profileData.age_range = userMessage.trim();
          response = "And what is your gender?\n\n1️⃣ Male\n2️⃣ Female";
          nextStage = STAGES.AWAIT_INTENT;
          break;

        // ... continue for all other fields from christ_connect_mvp_handover.md ...

        // --- Final Step ---
        case STAGES.AWAIT_INTENT: // Pretend this is the last step for this example
          profileData.gender = userMessage.trim();
          response =
            "What kind of connection are you primarily seeking?\n\n1️⃣ Prayer Partner\n2️⃣ Fellowship & Friends\n3️⃣ Open to Deeper Connections";
          nextStage = STAGES.COMPLETE; // Set to COMPLETE
          break;

        case STAGES.COMPLETE:
          // This user is now fully signed up!
          // We update their status for the dashboard metric.
          profileData.intent = userMessage.trim();
          profileData.current_stage = STAGES.COMPLETE;

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

          return "Thank you! Your Christ Connect profile is saved and you are officially on the Early Access waitlist. We've reserved your spot!\n\nMatching will begin in **14 days**. As a founding member, you'll get priority. We will notify you the moment your first matches are ready.\n\nWelcome to the community!";
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


