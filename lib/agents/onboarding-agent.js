// lib/agents/onboarding-agent.js
const { getSupabaseClient } = require("../config/database");
const { extractProfileData } = require("../utils/extractor");

// --- THE 2-TRACK STATE MACHINE ---
const STAGES = {
  START: "START",
  AWAIT_TRACK_SELECTION: "AWAIT_TRACK_SELECTION",

  // Track 1: Deeper Connections (Dating)
  DATING_Q1_BASICS: "DATING_Q1_BASICS", // Age, City, Job
  DATING_Q2_FAITH: "DATING_Q2_FAITH", // Denomination, Kids
  DATING_Q3_VALUES: "DATING_Q3_VALUES", // Dealbreakers
  DATING_Q4_PHOTO: "DATING_Q4_PHOTO", // Photo Upload

  // Track 2: Friends & Fellowship
  FRIEND_Q1_INTENT: "FRIEND_Q1_INTENT", // Prayer or Buddy?
  FRIEND_Q2_BASICS: "FRIEND_Q2_BASICS", // Age, Gender, Location
  FRIEND_Q3_INTERESTS: "FRIEND_Q3_INTERESTS", // Interests
  FRIEND_Q4_PREFS: "FRIEND_Q4_PREFS", // Men/Women only?

  // Done
  COMPLETE: "COMPLETE",
};

class OnboardingAgent {
  constructor() {
    this.agentName = "onboarding_agent";
  }

  async processMessage(userMessage, session, userStatus) {
    const waId = session.wa_id || session.user_id;
    const supabase = getSupabaseClient();

    // 1. Get or Create Profile
    let { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("wa_id", waId)
      .single();

    if (!profile) {
      const { data: newProfile } = await supabase
        .from("user_profiles")
        .insert({
          wa_id: waId,
          status: "onboarding_started",
          profile_data: { current_stage: STAGES.START },
        })
        .select()
        .single();
      profile = newProfile;
    }

    let currentStage = profile.profile_data.current_stage || STAGES.START;
    let profileData = profile.profile_data;
    let response = "";
    let nextStage = currentStage;

    // --- STATE MACHINE ---

    switch (currentStage) {
      // --- STEP 0: WELCOME & TRIAGE ---
      case STAGES.START:
        response =
          "👋 *Welcome to Christ Connect!*\n\n" +
          "I’m Grace, your companion here to help you find your people in the faith. ✝️\n" +
          "To introduce you to the right ones, what is your heart looking for today?\n\n" +
          "💍 *1. Deeper Connections* (Godly partner/spouse)\n" +
          "🤝 *2. Friends & Fellowship* (Prayer, chat, community)";

        nextStage = STAGES.AWAIT_TRACK_SELECTION;
        break;

      case STAGES.AWAIT_TRACK_SELECTION:
        const choice = userMessage.trim();
        if (choice === "1" || choice.toLowerCase().includes("deeper")) {
          // TRACK 1: DATING
          profileData.intent_mode = "Deeper Connections";
          response =
            "That is a beautiful desire. 'He who finds a wife finds a good thing.' ❤️\n\n" +
            "Let’s build your profile so I can match you. Tell me:\n" +
            "**What is your age, which city do you live in, and what do you do for a living?**";
          nextStage = STAGES.DATING_Q1_BASICS;
        } else {
          // TRACK 2: FELLOWSHIP (Default for safety)
          profileData.intent_mode = "Friends & Fellowship";
          response =
            "Awesome! Fellowship is the glue of the Kingdom. 🤝\n\n" +
            "First, what’s the mood today?\n" +
            "**Are you looking for a 'Prayer Partner' (serious support) or a 'Buddy' (hobbies/hangout)?**";
          nextStage = STAGES.FRIEND_Q1_INTENT;
        }
        break;

      // ============================================================
      // TRACK 1: DEEPER CONNECTIONS (DATING)
      // ============================================================

      case STAGES.DATING_Q1_BASICS:
        const d1 = await extractProfileData(
          userMessage,
          "age (number), city, job_title"
        );
        Object.assign(profileData, d1);

        response =
          `Nice to meet you! A ${d1.job_title || "hard worker"} in ${
            d1.city || "SA"
          }! 🇿🇦\n\n` +
          "Now, the important part—being equally yoked.\n" +
          "**Which church denomination do you feel at home in? And do you have children (or want them)?**";
        nextStage = STAGES.DATING_Q2_FAITH;
        break;

      case STAGES.DATING_Q2_FAITH:
        const d2 = await extractProfileData(
          userMessage,
          "denomination, has_children (boolean), wants_children (boolean)"
        );
        Object.assign(profileData, d2);

        response =
          "Understood. I'll keep that in mind for matches. 🙏\n\n" +
          "We all have boundaries. **Is there anything you absolutely cannot accept? (e.g., Smoker, unemployed, someone far away?)**";
        nextStage = STAGES.DATING_Q3_VALUES;
        break;

      case STAGES.DATING_Q3_VALUES:
        profileData.dealbreakers = userMessage;

        response =
          "Got it. I'm already scanning for matches who fit that description. 🕵️‍♀️\n\n" +
          "**Last step: Please upload a photo of yourself.**\n" +
          "Attraction is part of God's design, and I want to present you at your best. (Just tap the 📷 icon!)";
        nextStage = STAGES.DATING_Q4_PHOTO;
        break;

      case STAGES.DATING_Q4_PHOTO:
        // Check if message is image OR text contains "skip"
        if (
          session.lastMessageType === "image" ||
          userMessage.toLowerCase().includes("skip")
        ) {
          profileData.photo_uploaded = true;

          response =
            "Profile complete! 🎉\n\n" +
            "I’ve added you to the confidential matching pool. I will message you the moment I find a match who fits your heart.\n" +
            "Praying for this journey with you! 🙏";
          nextStage = STAGES.COMPLETE;
        } else {
          return "Please upload a photo to continue (or type 'Skip' if you prefer not to).";
        }
        break;

      // ============================================================
      // TRACK 2: FRIENDS & FELLOWSHIP
      // ============================================================

      case STAGES.FRIEND_Q1_INTENT:
        const f1 = await extractProfileData(
          userMessage,
          "sub_intent (Prayer or Buddy)"
        );
        profileData.sub_intent = f1.sub_intent || "Buddy";

        // REVISED ANGLE: SEASON OF LIFE (No "Gogo")
        response =
          "Cool. Let’s find your tribe. 🌿\n" +
          "To make sure I connect you with someone in your **season of life**, **tell me your age, gender, and where you're from?**";
        nextStage = STAGES.FRIEND_Q2_BASICS;
        break;

      case STAGES.FRIEND_Q2_BASICS:
        const f2 = await extractProfileData(userMessage, "age, gender, city");
        Object.assign(profileData, f2);

        response =
          `${f2.city || "There"} is a great place! 🌊\n` +
          "To give you something to talk about—**what are you into? Soccer, Music, Business, or maybe Bible Study?**";
        nextStage = STAGES.FRIEND_Q3_INTERESTS;
        break;

      case STAGES.FRIEND_Q3_INTERESTS:
        profileData.interests = userMessage;

        response =
          "Nice mix! 🔥\n" +
          "**Do you prefer to chat with the same gender only (Brothers/Sisters), or are you open to mixed chats?**";
        nextStage = STAGES.FRIEND_Q4_PREFS;
        break;

      case STAGES.FRIEND_Q4_PREFS:
        profileData.gender_pref = userMessage.toLowerCase().includes("mixed")
          ? "mixed"
          : "same_gender";

        // REVISED: THE "WAITLIST" PROMISE
        response =
          "Profile complete! 🎉\n\n" +
          "I’ve added you to our community pool. I don't have a perfect match online *right now*, but I am searching. 🕵️‍♀️\n\n" +
          "**The moment someone joins who matches your vibe and interests, I will send you a message.** Hang tight! 🙏";
        nextStage = STAGES.COMPLETE;
        break;

      case STAGES.COMPLETE:
        return "You are all set up! Use the main menu to manage your profile.";
    }

    // 3. Save State
    profileData.current_stage = nextStage;
    await supabase
      .from("user_profiles")
      .update({
        profile_data: profileData,
        status:
          nextStage === STAGES.COMPLETE
            ? "waitlist_completed"
            : "onboarding_started",
      })
      .eq("wa_id", waId);

    return response;
  }
}

module.exports = new OnboardingAgent();
