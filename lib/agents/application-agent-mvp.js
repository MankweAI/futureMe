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
    let application = await this.getOrCreateApplication(waId);

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

    await this.saveApplication(application);
    return response;
  }

  async handleQuickMatch(userMessage, application) {
    const step = application.stage_progress?.match_step || 1;

    if (step === 1) {
      application.stage_progress = { match_step: 2 };
      return "Let's find your bursaries! 🎯\n\n📍 Step 1/11\n\n🇿🇦 Are you a SA citizen or permanent resident?\n\n1️⃣ Yes\n2️⃣ No";
    }

    if (step === 2) {
      application.is_sa_citizen = /yes|1/i.test(userMessage);
      if (!application.is_sa_citizen) {
        application.status = "ineligible";
        return "😔 Most SA bursaries require citizenship.\n\nTry:\n• International scholarships\n• Study loans\n• Part-time work\n\nNeed career guidance instead?";
      }
      application.stage_progress.match_step = 3;
      return "✅ Great!\n\n📍 Step 2/11\n\n🎓 Your academic level?\n\n1️⃣ High school\n2️⃣ University\n3️⃣ Postgrad";
    }

    if (step === 3) {
      const levelMap = { 1: "high_school", 2: "university", 3: "postgrad" };
      application.academic_level =
        levelMap[userMessage.trim()] || "high_school";
      application.stage_progress.match_step = 4;
      return "📍 Step 3/11\n\n📚 Field of study?\n\n1️⃣ STEM\n2️⃣ Commerce/Business\n3️⃣ Health Sciences\n4️⃣ Humanities\n5️⃣ Other";
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
      return "📍 Step 4/11\n\n💰 Household annual income?\n\n1️⃣ R0-R350k\n2️⃣ R350k-R600k\n3️⃣ Above R600k";
    }

    if (step === 5) {
      const incomeMap = { 1: 200000, 2: 475000, 3: 700000 };
      application.household_income = incomeMap[userMessage.trim()] || 200000;

      // ✅ FIX: Set default academic_average for matching
      application.academic_average = 65; // Default for early matching

      // 🎉 SHOW BURSARIES EARLY!
      const matches = await this.matchBursaries(application);
      application.matched_bursaries = matches;

      application.current_stage = STAGES.BASIC_DETAILS;
      application.stage_progress = { detail_step: 1 };

      // ✅ FIX: Enhanced bursary display with dates
      return `🎉 Great news! You match these bursaries:\n\n${this.formatMatchesEarly(
        matches
      )}\n\n━━━━━━━━━━━━━━━\n\nReady to apply? Let's get your details! 📋\n\n📍 Step 5/11\n\n👤 What's your full name?`;
    }

    return "Please choose a number from the options.";
  }

  async handleBasicDetails(userMessage, application) {
    const step = application.stage_progress?.detail_step || 1;

    if (step === 1) {
      application.full_name = userMessage.trim();
      application.stage_progress.detail_step = 2;
      return `Thanks ${
        application.full_name.split(" ")[0]
      }! ✅\n\n📍 Step 6/11\n\n🆔 Your SA ID number?\n(13 digits)`;
    }

    if (step === 2) {
      application.id_number = userMessage.replace(/\s/g, "");
      application.stage_progress.detail_step = 3;
      return "Perfect! ✅\n\n📍 Step 7/11\n\n📧 Email address?";
    }

    if (step === 3) {
      const email = userMessage.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "That doesn't look valid. Try again (e.g., student@gmail.com)";
      }
      application.email = email;
      application.phone_number = application.wa_id;
      application.stage_progress.detail_step = 4;
      return "📍 Step 8/11\n\n🗺️ Which province?\n\n1️⃣ Gauteng\n2️⃣ Western Cape\n3️⃣ KZN\n4️⃣ Eastern Cape\n5️⃣ Other";
    }

    if (step === 4) {
      const provinceMap = {
        1: "Gauteng",
        2: "Western Cape",
        3: "KZN",
        4: "Eastern Cape",
        5: "Other",
      };
      application.province = provinceMap[userMessage.trim()] || "Other";
      application.stage_progress.detail_step = 5;
      return "📍 Step 9/11\n\n📊 Academic average?\n(Percentage, e.g., 75)";
    }

    if (step === 5) {
      const average = parseFloat(userMessage.trim());
      if (isNaN(average)) {
        return "Please enter a number (e.g., 75)";
      }
      application.academic_average = average;

      // ✅ FIX: Re-match bursaries with actual average
      const matches = await this.matchBursaries(application);
      application.matched_bursaries = matches;

      application.stage_progress.detail_step = 6;
      return "Great! ✅\n\n📍 Step 10/11\n\n✍️ Why do you need this bursary?\n(1-2 sentences is fine!)";
    }

    if (step === 6) {
      application.motivation_text = userMessage.trim();
      application.eligibility_score = this.calculateScore(application);
      application.application_ref = this.generateRef(application);

      application.current_stage = STAGES.REVIEW;
      application.stage_progress = { review: true };

      return this.generateReviewSummary(application);
    }

    return "Please provide your answer.";
  }

  async handleReview(userMessage, application) {
    const response = userMessage.toLowerCase().trim();

    if (response.includes("submit") || response === "1") {
      application.status = "submitted";
      application.submitted_at = new Date().toISOString();
      application.current_stage = STAGES.COMPLETE;

      await this.saveApplication(application);

      const emailResult = await sendApplicationEmail(application);

      if (emailResult.success) {
        return `🎉 Application submitted successfully!\n\n━━━━━━━━━━━━━━━━━━━━━\n✅ YOUR APPLICATION\n━━━━━━━━━━━━━━━━━━━━━\n\nReference: ${
          application.application_ref
        }\n📧 Email sent to funders\n📬 Copy sent to: ${
          application.email
        }\n\nMatched Bursaries:\n${this.formatMatches(
          application.matched_bursaries
        )}\n\n━━━━━━━━━━━━━━━━━━━━━\n\n📧 Check your email for confirmation!\n⏰ You'll hear back in 2-3 weeks.\n\nNeed anything else? 💙`;
      } else {
        return `🎉 Application submitted!\n\nReference: ${
          application.application_ref
        }\n\n⚠️ Email delivery pending - we'll send it shortly.\n\nMatched bursaries:\n${this.formatMatches(
          application.matched_bursaries
        )}`;
      }
    }

    if (response.includes("edit") || response === "2") {
      return "Editing coming soon! For now, restart with 'cancel application'.";
    }

    return "Please choose:\n\n1️⃣ Submit ✅\n2️⃣ Edit ✏️";
  }

  generateReviewSummary(application) {
    return `━━━━━━━━━━━━━━━━━━━━━\n📋 REVIEW YOUR APPLICATION\n━━━━━━━━━━━━━━━━━━━━━\n\n📍 Step 11/11\n\n👤 ${
      application.full_name
    }\n📧 ${application.email}\n🎓 ${application.field_of_study} student\n📊 ${
      application.academic_average
    }% average\n🗺️ ${
      application.province
    }\n\n✍️ Motivation:\n"${application.motivation_text.substring(0, 80)}${
      application.motivation_text.length > 80 ? "..." : ""
    }"\n\n🎯 Match Score: ${
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

    // Siemens - STEM priority
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

    // Momentum - Commerce
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

    // Metropolitan Health - Health Sciences
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

    // Bureau Veritas - STEM/Engineering
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

    // Fallback bursary
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

  // ✅ FIX: Enhanced formatMatchesEarly with dates
  formatMatchesEarly(matches) {
    if (!matches || matches.length === 0) {
      return "• We're finding matches for you...";
    }

    return matches
      .map((m, i) => {
        const emoji =
          m.match_score >= 0.9 ? "🏆" : m.match_score >= 0.85 ? "⭐" : "🌟";
        return `${i + 1}. ${emoji} **${m.name}** (${Math.round(
          m.match_score * 100
        )}% match)\n   💰 ${m.amount}\n   📅 Closes: ${m.deadline}`;
      })
      .join("\n\n");
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
    const initials = app.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `FME-${initials}-${timestamp}`;
  }

  async getOrCreateApplication(waId) {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from("bursary_applications")
        .select("*")
        .eq("wa_id", waId)
        .eq("status", "draft")
        .single();
      if (data) return data;

      const { data: newApp } = await supabase
        .from("bursary_applications")
        .insert({
          wa_id: waId,
          current_stage: STAGES.QUICK_MATCH,
          status: "draft",
          stage_progress: {},
        })
        .select()
        .single();

      return (
        newApp || {
          wa_id: waId,
          current_stage: STAGES.QUICK_MATCH,
          stage_progress: {},
        }
      );
    } catch (error) {
      console.error("Application error:", error);
      return {
        id: null,
        wa_id: waId,
        current_stage: STAGES.QUICK_MATCH,
        stage_progress: {},
      };
    }
  }

  async saveApplication(application) {
    if (!application.id) return;
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from("bursary_applications")
        .update({ ...application, updated_at: new Date().toISOString() })
        .eq("id", application.id);
    } catch (error) {
      console.error("Save error:", error);
    }
  }
}

module.exports = new ApplicationAgentMVP();
