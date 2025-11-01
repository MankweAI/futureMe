const { getSupabaseClient } = require("../config/database");
const { sendApplicationEmail } = require("../email-service");

// --- NEW LOGIC: A clear, single-state machine ---
const STEPS = {
  START: "START",
  AWAIT_FULL_NAME: "AWAIT_FULL_NAME",
  AWAIT_EMAIL: "AWAIT_EMAIL",
  AWAIT_PROVINCE: "AWAIT_PROVINCE",
  AWAIT_CITIZENSHIP: "AWAIT_CITIZENSHIP",
  AWAIT_ACADEMIC_LEVEL: "AWAIT_ACADEMIC_LEVEL",
  AWAIT_FIELD_OF_STUDY: "AWAIT_FIELD_OF_STUDY",
  AWAIT_ACADEMIC_AVERAGE: "AWAIT_ACADEMIC_AVERAGE",
  AWAIT_HOUSEHOLD_INCOME: "AWAIT_HOUSEHOLD_INCOME",
  AWAIT_MOTIVATION: "AWAIT_MOTIVATION",
  AWAIT_REVIEW: "AWAIT_REVIEW",
  COMPLETE: "COMPLETE",
};

class ApplicationAgentMVP {
  constructor() {
    this.agentName = "application_mvp";

    // --- NEW LOGIC: Handler map to call the right function based on state ---
    this.stepHandlers = {
      [STEPS.START]: this.handleStart,
      [STEPS.AWAIT_FULL_NAME]: this.handleFullName,
      [STEPS.AWAIT_EMAIL]: this.handleEmail,
      [STEPS.AWAIT_PROVINCE]: this.handleProvince,
      [STEPS.AWAIT_CITIZENSHIP]: this.handleCitizenship,
      [STEPS.AWAIT_ACADEMIC_LEVEL]: this.handleAcademicLevel,
      [STEPS.AWAIT_FIELD_OF_STUDY]: this.handleFieldOfStudy,
      [STEPS.AWAIT_ACADEMIC_AVERAGE]: this.handleAcademicAverage,
      [STEPS.AWAIT_HOUSEHOLD_INCOME]: this.handleHouseholdIncome,
      [STEPS.AWAIT_MOTIVATION]: this.handleMotivation,
      [STEPS.AWAIT_REVIEW]: this.handleReview,
      [STEPS.COMPLETE]: this.handleComplete,
    };
  }

  // --- NEW LOGIC: Main processor is now simple and delegates to handlers ---
  async processMessage(userMessage, session) {
    const waId = session.wa_id || session.user_id;
    let application;

    try {
      application = await this.getOrCreateApplication(waId);
    } catch (error) {
      console.error("Failed to get/create application:", error);
      return "Sorry, I'm having trouble accessing your application right now. Please try again in a moment.";
    }

    const currentStep = application.current_step || STEPS.START;
    const handler = this.stepHandlers[currentStep];

    let response;
    if (handler) {
      response = await handler.call(this, userMessage, application);
    } else {
      // Fallback for an unknown state
      console.warn(`Unknown application step: ${currentStep} for user ${waId}`);
      application.current_step = STEPS.START;
      response = await this.handleStart(userMessage, application);
    }

    // Save the updated application state (including the new current_step)
    await this.saveApplication(application);
    return response;
  }

  // --- Step 1 ---
  async handleStart(userMessage, application) {
    application.current_step = STEPS.AWAIT_FULL_NAME;
    return "Let's start your bursary application! 🎯\n\nFirst, what's your full name?";
  }

  // --- Step 2 ---
  async handleFullName(userMessage, application) {
    application.full_name = userMessage.trim();
    application.current_step = STEPS.AWAIT_EMAIL;
    return `Thanks ${
      application.full_name.split(" ")[0]
    }! ✅\n\nWhat's your email address?`;
  }

  // --- Step 3 ---
  async handleEmail(userMessage, application) {
    const email = userMessage.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "That doesn't look like a valid email. Please try again (e.g., student@gmail.com)";
    }
    application.email = email;
    application.phone_number = application.wa_id;
    application.current_step = STEPS.AWAIT_PROVINCE;
    return "Perfect! ✅\n\nWhich province do you live in?\n\n1️⃣ Gauteng\n2️⃣ Western Cape\n3️⃣ KwaZulu-Natal\n4️⃣ Eastern Cape\n5️⃣ Other";
  }

  // --- Step 4 ---
  async handleProvince(userMessage, application) {
    const provinceMap = {
      1: "Gauteng",
      2: "Western Cape",
      3: "KwaZulu-Natal",
      4: "Eastern Cape",
      5: "Other",
    };
    application.province = provinceMap[userMessage.trim()] || "Other";
    application.current_step = STEPS.AWAIT_CITIZENSHIP;
    return "Got it. ✅\n\nAre you a South African citizen or permanent resident?\n\n1️⃣ Yes\n2️⃣ No";
  }

  // --- Step 5 ---
  async handleCitizenship(userMessage, application) {
    application.is_sa_citizen = /yes|1/i.test(userMessage);
    if (!application.is_sa_citizen) {
      application.status = "ineligible";
      application.current_step = STEPS.START; // Reset
      return "😔 Most SA bursaries require citizenship.\n\nTry:\n• International scholarships\n• Study loans\n• Part-time work\n\nIf you'd like, we can explore career guidance instead?";
    }
    application.current_step = STEPS.AWAIT_ACADEMIC_LEVEL;
    return "Great! ✅\n\nWhat's your current academic level?\n\n1️⃣ High school\n2️⃣ University\n3️⃣ Postgrad";
  }

  // --- Step 6 ---
  async handleAcademicLevel(userMessage, application) {
    const levelMap = { 1: "high_school", 2: "university", 3: "postgrad" };
    application.academic_level = levelMap[userMessage.trim()] || "high_school";
    application.current_step = STEPS.AWAIT_FIELD_OF_STUDY;
    return "Okay. ✅\n\nWhat is your intended field of study?\n\n1️⃣ STEM\n2️⃣ Commerce/Business\n3️⃣ Health Sciences\n4️⃣ Humanities\n5️⃣ Other";
  }

  // --- Step 7 ---
  async handleFieldOfStudy(userMessage, application) {
    const fieldMap = {
      1: "STEM",
      2: "Commerce",
      3: "Health Sciences",
      4: "Humanities",
      5: "Other",
    };
    application.field_of_study = fieldMap[userMessage.trim()] || "Other";
    application.current_step = STEPS.AWAIT_ACADEMIC_AVERAGE;
    return "Understood. ✅\n\nWhat is your academic average?\n(Please enter a percentage, e.g., 75)";
  }

  // --- Step 8 (This is where your loop was) ---
  async handleAcademicAverage(userMessage, application) {
    const average = parseFloat(userMessage.trim());
    if (isNaN(average) || average < 0 || average > 100) {
      return "Please enter a valid percentage number (e.g., 75)";
    }
    application.academic_average = average;
    application.current_step = STEPS.AWAIT_HOUSEHOLD_INCOME;
    return "Great. ✅\n\nWhat is your total household annual income?\n\n1️⃣ R0 - R350k\n2️⃣ R350k - R600k\n3️⃣ Above R600k";
  }

  // --- Step 9 ---
  async handleHouseholdIncome(userMessage, application) {
    const incomeMap = { 1: 200000, 2: 475000, 3: 700000 };
    application.household_income = incomeMap[userMessage.trim()] || 200000;
    application.current_step = STEPS.AWAIT_MOTIVATION;
    return "Almost done! ✅\n\nLastly, why do you need this bursary?\n(1-2 sentences is fine!)";
  }

  // --- Step 10 (Final data step) ---
  async handleMotivation(userMessage, application) {
    application.motivation_text = userMessage.trim();

    // All data collected, now run matching and scoring
    application.eligibility_score = this.calculateScore(application);
    application.application_ref = this.generateRef(application);
    const matches = await this.matchBursaries(application);
    application.matched_bursaries = matches;

    // Set next step to Review
    application.current_step = STEPS.AWAIT_REVIEW;
    return this.generateReviewSummary(application);
  }

  // --- Step 11 (Review) ---
  async handleReview(userMessage, application) {
    const response = userMessage.toLowerCase().trim();

    if (response.includes("submit") || response === "1") {
      application.status = "submitted";
      application.submitted_at = new Date().toISOString();
      application.current_step = STEPS.COMPLETE;

      // Save *before* sending email
      await this.saveApplication(application);
      const emailResult = await sendApplicationEmail(application);

      if (emailResult.success) {
        return `🎉 Application submitted successfully!\n\nReference: ${
          application.application_ref
        }\n📧 Email sent to funders\n📬 Copy sent to: ${
          application.email
        }\n\nMatched Bursaries:\n${this.formatMatches(
          application.matched_bursaries
        )}\n\n📧 Check your email for confirmation!`;
      } else {
        return `🎉 Application submitted!\n\nReference: ${application.application_ref}\n\n⚠️ Email delivery pending - we'll send it shortly.`;
      }
    }

    if (response.includes("edit") || response === "2") {
      // Reset to start for editing
      application.current_step = STEPS.AWAIT_FULL_NAME;
      return "No problem, let's edit your details. What's your full name?";
    }

    return "Please choose:\n\n1️⃣ Submit ✅\n2️⃣ Edit ✏️";
  }

  // --- Step 12 (Complete) ---
  async handleComplete(userMessage, application) {
    return `✅ Your application (Ref: ${application.application_ref}) is already complete!\n\nYou'll hear back in 2-3 weeks.\n\nNeed anything else? I can also help with Career Guidance.`;
  }

  // ---
  // HELPER AND DATABASE FUNCTIONS (Unchanged, but robust `getOrCreateApplication`)
  // ---

  generateReviewSummary(application) {
    return `━━━━━━━━━━━━━━━━━━━━━\n📋 REVIEW YOUR APPLICATION\n━━━━━━━━━━━━━━━━━━━━━\n\n👤 ${
      application.full_name
    }\n📧 ${application.email}\n🗺️ ${application.province}\n🎓 ${
      application.field_of_study
    }\n📊 ${
      application.academic_average
    }% average\n💰 R${application.household_income.toLocaleString()}/year\n\n✍️ Motivation:\n"${application.motivation_text.substring(
      0,
      80
    )}..."\n\n🎯 Match Score: ${
      application.eligibility_score
    }/100\n\n🎁 Matched Bursaries:\n${this.formatMatches(
      application.matched_bursaries
    )}\n\n━━━━━━━━━━━━━━━━━━━━━\n\nReady to submit?\n\n1️⃣ Submit Application ✅\n2️⃣ Edit Details ✏️`;
  }

  async matchBursaries(application) {
    const matches = [];
    const {
      field_of_study,
      household_income,
      academic_average = 65,
    } = application;

    if (field_of_study === "STEM" && academic_average >= 60) {
      matches.push({
        name: "Siemens Bursary",
        funder: "Siemens South Africa",
        match_score: 0.92,
        reason: "STEM field + strong academics",
        amount: "R80,000/year + internship",
        deadline: "31 December 2025",
        contact_email: "bursaries@siemens.co.za",
      });
    }
    if (field_of_study === "Commerce") {
      matches.push({
        name: "Momentum Bursary",
        funder: "Momentum Metropolitan",
        match_score: 0.85,
        reason: "Commerce/Business student",
        amount: "Full tuition",
        deadline: "15 December 2025",
        contact_email: "bursaries@momentum.co.za",
      });
    }
    if (field_of_study === "Health Sciences" && academic_average >= 65) {
      matches.push({
        name: "Metropolitan Health Bursary",
        funder: "Metropolitan Health Group",
        match_score: 0.88,
        reason: "Health Sciences + good performance",
        amount: "R60,000/year",
        deadline: "30 November 2025",
        contact_email: "bursaries@metropolitanhealth.co.za",
      });
    }
    if (matches.length === 0 && household_income < 350000) {
      matches.push({
        name: "General Financial Aid",
        funder: "FutureMe Fund",
        match_score: 0.7,
        reason: "Financial need-based",
        amount: "Varies",
        deadline: "Ongoing",
        contact_email: "support@futureme.co.za",
      });
    }
    return matches.slice(0, 3);
  }

  formatMatches(matches) {
    return matches
      .map(
        (m, i) =>
          `${i + 1}. ${m.name} (${Math.round(m.match_score * 100)}% match)`
      )
      .join("\n");
  }

  calculateScore(app) {
    let score = 50;
    if (app.is_sa_citizen) score += 10;
    if (app.academic_average >= 75) score += 20;
    else if (app.academic_average >= 60) score += 15;
    if (app.household_income < 350000) score += 15;
    if (app.field_of_study === "STEM") score += 5;
    return Math.min(score, 100);
  }

  generateRef(app) {
    const initials = (app.full_name || "USER")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `FME-${initials}-${timestamp}`;
  }

  // --- NEW LOGIC: Robust database function ---
  async getOrCreateApplication(waId) {
    const supabase = getSupabaseClient();
    try {
      // 1. Try to find an existing draft
      const { data: existingApp, error: fetchError } = await supabase
        .from("bursary_applications")
        .select("*")
        .eq("wa_id", waId)
        .eq("status", "draft")
        .single();

      if (existingApp) {
        return existingApp;
      }

      // 2. If no draft exists (error code PGRST116 is "Not Found"), create one
      if (fetchError && fetchError.code === "PGRST116") {
        console.log(`No draft found for ${waId}, creating new one.`);
        const { data: newApp, error: insertError } = await supabase
          .from("bursary_applications")
          .insert({
            wa_id: waId,
            current_step: STEPS.START, // Use new state machine
            status: "draft",
            stage_progress: {}, // Keep for schema compatibility, but we won't use it
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create new application:", insertError);
          throw insertError; // Throw error to be caught by processMessage
        }

        // 3. Return the fully formed new application
        return newApp;
      }

      // 4. If there was a different fetch error, throw it
      if (fetchError) {
        throw fetchError;
      }
    } catch (error) {
      console.error(
        `Critical getOrCreateApplication error for ${waId}:`,
        error
      );
      // Re-throw the error so processMessage can handle it
      throw new Error(`Failed to get or create application: ${error.message}`);
    }
  }

  async saveApplication(application) {
    // This guard is still important
    if (!application.id) {
      console.error("Save error: Attempted to save application with no ID.");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("bursary_applications")
        .update({
          ...application,
          updated_at: new Date().toISOString(),
          current_step: application.current_step, // Ensure new state is saved
        })
        .eq("id", application.id);

      if (error) {
        console.error("Save error:", error);
      }
    } catch (error) {
      console.error("Critical saveApplication error:", error);
    }
  }
}

module.exports = new ApplicationAgentMVP();
