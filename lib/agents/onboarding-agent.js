// lib/agents/onboarding-agent.js
const { getSupabaseClient } = require("../config/database");

// --- NEW EXPANDED STAGES ---
const STAGES = {
  START: "START",
  AWAIT_AGE: "AWAIT_AGE",
  AWAIT_GENDER: "AWAIT_GENDER",
  AWAIT_INTENT: "AWAIT_INTENT",

  // --- Phase 2: Faith Details ---
  AWAIT_DENOMINATION: "AWAIT_DENOMINATION",
  AWAIT_RHYTHM: "AWAIT_RHYTHM", // Spiritual Rhythm

  // --- Phase 3: Type-Specific Questions ---
  AWAIT_PRAYER_STYLE: "AWAIT_PRAYER_STYLE", // For Prayer Partners
  AWAIT_FELLOWSHIP_INTEREST: "AWAIT_FELLOWSHIP_INTEREST", // For Fellowship

  // --- Phase 4: Matching Preferences ---
  AWAIT_MATCH_GENDER_PREF: "AWAIT_MATCH_GENDER_PREF",
  AWAIT_MATCH_AGE_PREF: "AWAIT_MATCH_AGE_PREF",

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
      response =
        "Welcome to Christ Connect! 🙏✨\n\nWe're building a safe, Christ-centered community for believers to find prayer partners, fellowship, and meaningful connections. 🕊️\n\nWe're so excited you're here! This week, we're getting your profile ready, and on **Nov 24th**, your journey begins! 🚀\n\nTo find you the *best*, most aligned matches, we'll ask a few quick questions about you and your preferences.\n\nFirst, what’s your first name? 🌿";
      nextStage = STAGES.AWAIT_AGE;
    }

    // --- Subsequent Steps ---
    else {
      const lastStage = profile.profile_data.current_stage;

      switch (lastStage) {
        // --- Phase 1: Basic Info ---
        case STAGES.AWAIT_AGE:
          profileData.name = userMessage.trim();
          response = `Awesome, ${profileData.name}! 👋\n\nHow old are you? (Enter the number, e.g., 24) 🎂`;
          nextStage = STAGES.AWAIT_GENDER;
          break;

        case STAGES.AWAIT_GENDER:
          const age = parseInt(userMessage.trim(), 10);
          if (isNaN(age) || age < 18 || age > 99) {
            return "Please enter a valid age as a number (e.g., 24). We require members to be 18 or older.";
          }
          profileData.age = age;
          response = `Got it! 💫\n\nWhat is your gender?\n1️⃣ Male\n2️⃣ Female\n3️⃣ Prefer not to say`;
          nextStage = STAGES.AWAIT_INTENT;
          break;

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
          nextStage = STAGES.AWAIT_DENOMINATION; // <-- NOW GOES TO PHASE 2
          break;

        // --- Phase 2: Faith Details ---
        case STAGES.AWAIT_DENOMINATION:
          const intentChoice = userMessage.trim();
          if (!/^[1-3]$/.test(intentChoice)) {
            return "Please reply with just the number: 1, 2, or 3.";
          }
          profileData.intent = {
            1: "Prayer Partner",
            2: "Fellowship & Friends",
            3: "Deeper Connections",
          }[intentChoice];

          response =
            "Great! We all worship in different ways. What is your church denomination or faith background?\n\n(e.g., Baptist, Methodist, Charismatic, Non-denominational, or 'Just a follower of Christ')";
          nextStage = STAGES.AWAIT_RHYTHM;
          break;

        case STAGES.AWAIT_RHYTHM:
          profileData.denomination = userMessage.trim();
          response =
            "What's your spiritual rhythm like?\n\n1️⃣ Daily devotions\n2️⃣ Weekly church-goer\n3️⃣ Finding my rhythm\n4️⃣ It's complicated";
          nextStage = STAGES.AWAIT_MATCH_GENDER_PREF; // <-- Default next step

          // --- Phase 3: Conditional Branching ---
          // Check the intent and re-route if needed
          if (profileData.intent === "Prayer Partner") {
            nextStage = STAGES.AWAIT_PRAYER_STYLE; // Go to prayer style
          } else if (profileData.intent === "Fellowship & Friends") {
            nextStage = STAGES.AWAIT_FELLOWSHIP_INTEREST; // Go to fellowship
          }
          // If "Deeper Connections", we skip to Phase 4
          break;

        // --- Phase 3: Type-Specific Cases ---
        case STAGES.AWAIT_PRAYER_STYLE:
          profileData.rhythm = userMessage.trim(); // Saves rhythm
          response =
            "What's your preferred prayer style?\n\n1️⃣ Structured (e.g., ACTS)\n2️⃣ Conversational\n3️⃣ Contemplative/Silent\n4️⃣ Open to all";
          nextStage = STAGES.AWAIT_MATCH_GENDER_PREF; // Now go to Phase 4
          break;

        case STAGES.AWAIT_FELLOWSHIP_INTEREST:
          profileData.rhythm = userMessage.trim(); // Saves rhythm
          response =
            "What's your ideal fellowship?\n\n1️⃣ Bible study\n2️⃣ Coffee & chat\n3️⃣ Outdoor activities\n4️⃣ Serving/Volunteering";
          nextStage = STAGES.AWAIT_MATCH_GENDER_PREF; // Now go to Phase 4
          break;

        // --- Phase 4: Matching Preferences ---
        case STAGES.AWAIT_MATCH_GENDER_PREF:
          // This case needs to save data from the *previous* step
          if (profileData.intent === "Prayer Partner") {
            profileData.prayer_style = userMessage.trim();
          } else if (profileData.intent === "Fellowship & Friends") {
            profileData.fellowship_interest = userMessage.trim();
          } else {
            // This was the path for "Deeper Connections"
            profileData.rhythm = userMessage.trim();
          }

          response =
            "Finally, let's set your preferences. Who are you looking to connect with?\n\nWhich gender?\n1️⃣ Men only\n2️⃣ Women only\n3️⃣ No preference";
          nextStage = STAGES.AWAIT_MATCH_AGE_PREF;
          break;

        case STAGES.AWAIT_MATCH_AGE_PREF:
          profileData.match_gender_pref = userMessage.trim();
          response =
            "And what age range for connections?\n\n1️⃣ Similar to my age (e.g., 22-28)\n2️⃣ Open to any age\n3️⃣ Prefer mentors (older)\n4️⃣ Prefer peers (younger)";
          nextStage = STAGES.COMPLETE; // Now we are ready
          break;

        // --- Phase 5: COMPLETE / Celebration ---
        case STAGES.COMPLETE:
          profileData.match_age_pref = userMessage.trim();
          profileData.current_stage = STAGES.COMPLETE;

          // Update DB Status for dashboard
          const { error: completeError } = await supabase
            .from("user_profiles")
            .update({
              profile_data: profileData,
              status: "waitlist_completed",
              completed_at: new Date().toISOString(),
            })
            .eq("wa_id", waId);

          if (completeError) {
            /* ... error handling ... */
          }

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
      /* ... error handling ... */
    }

    return response;
  }
}

module.exports = new OnboardingAgent();
