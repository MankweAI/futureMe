const { getSupabaseClient } = require("../config/database");
const { sendApplicationEmail } = require("../email-service");

const STAGES = {
  QUICK_MATCH: "quick_match",
  BASIC_DETAILS: "basic_details",
  REVIEW: "review",
  COMPLETE: "complete",
};

class ApplicationAgentMVP {
  constructor() {
    this.agentName = "application_mvp";
  }

  async processMessage(userMessage, session) {
    const waId = session.wa_id || session.user_id;

    // ✅ FIX: Properly handle application retrieval errors
    let application;
    try {
      application = await this.getOrCreateApplication(waId);
    } catch (error) {
      console.error("Failed to get/create application:", error);
      return "Sorry, I'm having trouble loading your application. Please try again in a moment.";
    }

    const currentStage = application.current_stage || STAGES.QUICK_MATCH;

    let response;
    switch (currentStage) {
      case STAGES.QUICK_MATCH:
        response = await this.handleQuickMatch(userMessage, application);
        break;
      case STAGES.BASIC_DETAILS:
        response = await this.handleBasicDetails(userMessage, application);
        break;
      case STAGES.REVIEW:
        response = await this.handleReview(userMessage, application);
        break;
      case STAGES.COMPLETE:
        response =
          "✅ Your application is complete! Check your email for confirmation.";
        break;
      default:
        response = "Let's start your bursary application!";
        application.current_stage = STAGES.QUICK_MATCH;
    }

    // ✅ FIX: Check save success and handle errors
    const saveSuccess = await this.saveApplication(application);
    if (!saveSuccess) {
      console.warn(`Failed to save application for ${waId}`);
    }

    return response;
  }

  // ---------------- QUICK MATCH (Steps 1-4 then preview) ----------------
  async handleQuickMatch(userMessage, application) {
    const step = application.stage_progress?.match_step || 1;

    if (step === 1) {
      application.stage_progress = { match_step: 2 };
      // --- MODIFICATION: Bolding & Emojis ---
      return "Let's find your bursaries! 🎯\n\n📍 *Step 1/11*\n\n🇿🇦 *Are you a SA citizen or permanent resident?*\n\n1️⃣ Yes\n2️⃣ No";
    }

    if (step === 2) {
      application.is_sa_citizen = /^(1|yes|y)$/i.test(userMessage.trim());
      if (!application.is_sa_citizen) {
        application.status = "ineligible";
        return "😔 Most SA bursaries require citizenship.\n\nTry:\n• International scholarships\n• Study loans\n• Part-time work\n\nNeed career guidance instead?";
      }
      application.stage_progress.match_step = 3;
      // --- MODIFICATION: Bolding & Emojis ---
      return "✅ Great!\n\n📍 *Step 2/11*\n\n🎓 *Your academic level?*\n\n1️⃣ High school\n2️⃣ University\n3️⃣ Postgrad";
    }

    if (step === 3) {
      const levelMap = { 1: "high_school", 2: "university", 3: "postgrad" };
      application.academic_level =
        levelMap[userMessage.trim()] || "high_school";
      application.stage_progress.match_step = 4;
      // --- MODIFICATION: Bolding & Emojis ---
      return "📍 *Step 3/11*\n\n📚 *Field of study?*\n\n1️⃣ STEM\n2️⃣ Commerce/Business\n3️⃣ Health Sciences\n4️⃣ Humanities\n5️⃣ Other";
    }

    if (step === 4) {
      const fieldMap = {
        1: "STEM",
        2: "Commerce",
        3: "Health Sciences",
        4: "Humanities",
        5: "Other",
      };
      application.field_of_study = fieldMap[userMessage.trim()] || "Other";
      application.stage_progress.match_step = 5;
      // --- MODIFICATION: Bolding & Emojis ---
      return "📍 *Step 4/11*\n\n💰 *Household annual income?*\n\n1️⃣ R0-R350k\n2️⃣ R350k-R600k\n3️⃣ Above R600k";
    }

    if (step === 5) {
      const incomeMap = { 1: 200000, 2: 475000, 3: 700000 };
      application.household_income = incomeMap[userMessage.trim()] || 200000;

      // Default average for early matching (will be replaced later)
      if (typeof application.academic_average !== "number") {
        application.academic_average = 65;
      }

      // Show bursaries EARLY
      const matches = await this.matchBursaries(application);
      application.matched_bursaries = matches;

      application.current_stage = STAGES.BASIC_DETAILS;
      application.stage_progress = { detail_step: 1 };

      // --- MODIFICATION: Enhanced Match Message ---
      return `🎉 *Great news!* You pre-qualify for:\n\n${this.formatMatchesEarly(
        matches
      )}\n\n━━━━━━━━━━━━━━━\n\nReady to apply? Let's get your details! 📋\n\n📍 *Step 5/11*\n\n👤 *What's your full name?*`;
    }

    return "Please choose a number from the options.";
  }

  // ---------------- BASIC DETAILS (Steps 5-10) ----------------
  async handleBasicDetails(userMessage, application) {
    const step = application.stage_progress?.detail_step || 1;

    if (step === 1) {
      application.full_name = userMessage.trim();
      application.stage_progress.detail_step = 2;
      // --- MODIFICATION: Bolding & Emojis ---
      return `Thanks ${
        application.full_name.split(" ")[0]
      }! ✅\n\n📍 *Step 6/11*\n\n🆔 *Your SA ID number?*\n(13 digits)`;
    }

    if (step === 2) {
      application.id_number = userMessage.replace(/\s/g, "");
      application.stage_progress.detail_step = 3;
      // --- MODIFICATION: Bolding & Emojis ---
      return "Perfect! ✅\n\n📍 *Step 7/11*\n\n📧 *Email address?*";
    }

    if (step === 3) {
      const email = userMessage.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "That doesn't look valid. Try again (e.g., student@gmail.com)";
      }
      application.email = email;
      application.phone_number = application.wa_id;
      application.stage_progress.detail_step = 4;
      // --- MODIFICATION: Bolding & Emojis ---
      return "📍 *Step 8/11*\n\n🗺️ *Which province?*\n\n1️⃣ Gauteng\n2️⃣ Western Cape\n3️⃣ KwaZulu-Natal\n4️⃣ Eastern Cape\n5️⃣ Other";
    }

    if (step === 4) {
      const provinceMap = {
        1: "Gauteng",
        2: "Western Cape",
        3: "KwaZulu-Natal",
        4: "Eastern Cape",
        5: "Other",
      };
      application.province = provinceMap[userMessage.trim()] || "Other";

      // ✅ FIX: Explicit step progression to academic average
      application.stage_progress.detail_step = 5;
      // --- MODIFICATION: Bolding & Emojis ---
      return "📍 *Step 9/11*\n\n📊 *Academic average?*\n(Percentage, e.g., 75)";
    }

    if (step === 5) {
      // ✅ FIX: Parse actual user input (not hardcoded 99)
      const avgStr = userMessage.trim().replace(",", ".");
      const average = parseFloat(avgStr);

      if (!Number.isFinite(average) || average < 0 || average > 100) {
        return "Please enter a valid percentage (0-100)";
      }

      application.academic_average = average;

      // Re-match with real average
      const matches = await this.matchBursaries(application);
      application.matched_bursaries = matches;

      application.stage_progress.detail_step = 6;
      // --- MODIFICATION: Bolding & Emojis ---
      return "Great! ✅\n\n📍 *Step 10/11*\n\n✍️ *Why do you need this bursary?*\n(1-2 sentences is fine!)";
    }

    if (step === 6) {
      application.motivation_text = userMessage.trim();
      application.eligibility_score = this.calculateScore(application);
      application.application_ref = this.generateRef(application);

      application.current_stage = STAGES.REVIEW;
      application.stage_progress = { review_step: 1 };

      return this.generateReviewSummary(application);
    }

    return "Please provide your answer.";
  }

  // ---------------- REVIEW (Step 11) ----------------
  async handleReview(userMessage, application) {
    const response = userMessage.toLowerCase().trim();

    if (response.includes("submit") || response === "1") {
      application.status = "submitted";
      application.submitted_at = new Date().toISOString();
      application.current_stage = STAGES.COMPLETE;

      // ✅ FIX: Verify save succeeded before sending email
      const saveSuccess = await this.saveApplication(application);

      if (!saveSuccess) {
        return "Sorry, there was a problem saving your application. Please try submitting again.";
      }

      // ✅ FIX: Send email only after successful DB save
      const emailResult = await sendApplicationEmail(application);

      // --- MODIFICATION: Polished Confirmation ---
      if (emailResult.success) {
        const funders =
          application.matched_bursaries
            ?.map((m) => `• ${m.funder}`)
            .join("\n") || "our funding partners";

        return `🎉 *Application Sent!*\n\nReference: *${application.application_ref}*\n\nYour profile has been securely submitted to our funding partners, including:\n${funders}\n\n📧 A confirmation has been sent to *${application.email}*.\n\nThank you for using FutureMe! 💙`;
      } else {
        return `🎉 *Application Submitted!*\n\nReference: *${
          application.application_ref
        }*\n\n⚠️ Email delivery pending - we'll send it shortly.\n\nMatched bursaries:\n${this.formatMatches(
          application.matched_bursaries
        )}`;
      }
    }

    if (response.includes("edit") || response === "2") {
      return "Editing coming soon! For now, restart with 'cancel application'.";
    }

    return "Please choose:\n\n1️⃣ Submit ✅\n2️⃣ Edit ✏️";
  }

  // ---------------- Helpers ----------------
  generateReviewSummary(application) {
    // --- MODIFICATION: Bolding & Emojis ---
    return `━━━━━━━━━━━━━━━━━━━━━\n📋 *REVIEW YOUR APPLICATION*\n━━━━━━━━━━━━━━━━━━━━━\n\n📍 *Step 11/11*\n\n👤 *${
      application.full_name
    }*\n📧 *${application.email}*\n🎓 *${
      application.field_of_study
    }* student\n📊 *${application.academic_average}%* average\n🗺️ *${
      application.province
    }*\n\n✍️ *Motivation:*\n"${(application.motivation_text || "").substring(
      0,
      120
    )}${
      (application.motivation_text || "").length > 120 ? "..." : ""
    }"\n\n🎯 *Match Score:* ${
      application.eligibility_score
    }/100\n\n🎁 *Matched Bursaries:*\n${this.formatMatches(
      application.matched_bursaries
    )}\n\n━━━━━━━━━━━━━━━━━━━━━\n\nReady to submit?\n\n1️⃣ *Submit Application* ✅\n2️⃣ *Edit Details* ✏️`;
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

    if (field_of_study === "STEM" && academic_average >= 70) {
      matches.push({
        name: "Bureau Veritas Bursary",
        funder: "Bureau Veritas South Africa",
        match_score: 0.9,
        reason: "Engineering excellence",
        amount: "R75,000/year + placement",
        deadline: "20 December 2025",
        contact_email: "bursaries@bureauveritas.co.za",
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

  // --- MODIFICATION: Enhanced Match Message ---
  formatMatchesEarly(matches) {
    if (!matches || matches.length === 0) {
      return "• We're finding matches for you...";
    }

    return matches
      .map((m, i) => {
        const emoji =
          m.match_score >= 0.9 ? "🏆" : m.match_score >= 0.85 ? "⭐" : "🌟";
        // Use bolding for WhatsApp
        return `${emoji} *${m.name}*\n   💰 ${m.amount}\n   📅 Closes: ${m.deadline}`;
      })
      .join("\n\n");
  }

  formatMatches(matches) {
    if (!matches || matches.length === 0) return "• No matches found";
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
    const initials = (app.full_name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `FME-${initials || "XX"}-${timestamp}`;
  }

  // ---------------- Persistence ----------------
  async getOrCreateApplication(waId) {
    const supabase = getSupabaseClient();

    try {
      // Try to load existing draft
      const { data, error } = await supabase
        .from("bursary_applications")
        .select("*")
        .eq("wa_id", waId)
        .eq("status", "draft")
        .single();

      // If draft exists, return it
      if (data) {
        console.log(`Loaded existing draft for ${waId}`);
        return data;
      }

      // If no draft exists (PGRST116 = not found), create one
      if (error && error.code === "PGRST116") {
        console.log(`Creating new draft for ${waId}`);

        const { data: newApp, error: insertError } = await supabase
          .from("bursary_applications")
          .insert({
            wa_id: waId,
            current_stage: STAGES.QUICK_MATCH,
            status: "draft",
            stage_progress: {},
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create new application:", insertError);
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        return newApp;
      }

      // If there was another error, throw it
      if (error) {
        console.error("Unexpected database error:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      // Should never reach here
      throw new Error("Unexpected state in getOrCreateApplication");
    } catch (error) {
      console.error("Critical error in getOrCreateApplication:", error);
      throw error; // Don't hide errors - let caller handle them
    }
  }

  async saveApplication(application) {
    // ✅ FIX: Handle missing ID by doing INSERT instead of failing silently
    if (!application.id) {
      console.warn(
        `Application has no ID, attempting INSERT for ${application.wa_id}`
      );

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("bursary_applications")
          .insert({
            ...application,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("INSERT error:", error);
          return false;
        }

        // ✅ FIX: Update application object with new ID
        application.id = data.id;
        console.log(`Application saved with new ID: ${data.id}`);
        return true;
      } catch (error) {
        console.error("Save application INSERT error:", error);
        return false;
      }
    }

    // ✅ FIX: Return success/failure status instead of silent fail
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("bursary_applications")
        .update({
          ...application,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) {
        console.error("UPDATE error:", error);
        return false;
      }

      console.log(`Application ${application.id} updated successfully`);
      return true;
    } catch (error) {
      console.error("Save application UPDATE error:", error);
      return false;
    }
  }
}

module.exports = new ApplicationAgentMVP();
