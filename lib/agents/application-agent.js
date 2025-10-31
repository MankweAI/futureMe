const openai = require("../config/openai");
const { getSupabaseClient } = require("../config/database");

const STAGES = {
  ELIGIBILITY: "eligibility",
  PERSONAL: "personal",
  CONTACT: "contact",
  ACADEMIC: "academic",
  FINANCIAL: "financial",
  MOTIVATION: "motivation",
  REVIEW: "review",
  COMPLETE: "complete",
};

const STAGE_ORDER = [
  STAGES.ELIGIBILITY,
  STAGES.PERSONAL,
  STAGES.CONTACT,
  STAGES.ACADEMIC,
  STAGES.FINANCIAL,
  STAGES.MOTIVATION,
  STAGES.REVIEW,
];

class ApplicationAgent {
  constructor() {
    this.agentName = "application";
  }

  async processMessage(userMessage, session) {
    const waId = session.wa_id || session.user_id;

    // Get or create application
    let application = await this.getOrCreateApplication(waId);

    // Handle special commands
    if (userMessage.toLowerCase().includes("cancel application")) {
      await this.cancelApplication(application);
      return "Your bursary application has been cancelled. You can start a new one anytime by saying 'apply for bursary'.";
    }

    if (userMessage.toLowerCase().includes("check status")) {
      return await this.checkApplicationStatus(application);
    }

    // Determine current stage
    const currentStage = application.current_stage || STAGES.ELIGIBILITY;

    // Route to stage handler
    let response;
    switch (currentStage) {
      case STAGES.ELIGIBILITY:
        response = await this.handleEligibility(userMessage, application);
        break;
      case STAGES.PERSONAL:
        response = await this.handlePersonal(userMessage, application);
        break;
      case STAGES.CONTACT:
        response = await this.handleContact(userMessage, application);
        break;
      case STAGES.ACADEMIC:
        response = await this.handleAcademic(userMessage, application);
        break;
      case STAGES.FINANCIAL:
        response = await this.handleFinancial(userMessage, application);
        break;
      case STAGES.MOTIVATION:
        response = await this.handleMotivation(userMessage, application);
        break;
      case STAGES.REVIEW:
        response = await this.handleReview(userMessage, application);
        break;
      case STAGES.COMPLETE:
        response =
          "Your application is complete! ✅ We'll notify you about matching bursaries.";
        break;
      default:
        response = "Let's restart your bursary application.";
        application.current_stage = STAGES.ELIGIBILITY;
    }

    // Save progress
    await this.saveApplication(application);

    return response;
  }

  async getOrCreateApplication(waId) {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from("bursary_applications")
        .select("*")
        .eq("wa_id", waId)
        .eq("status", "draft")
        .single();

      if (data) {
        return data;
      }

      // Create new application
      const { data: newApp, error: createError } = await supabase
        .from("bursary_applications")
        .insert({
          wa_id: waId,
          current_stage: STAGES.ELIGIBILITY,
          status: "draft",
          stage_progress: {},
          completed_stages: [],
        })
        .select()
        .single();

      return (
        newApp || {
          wa_id: waId,
          current_stage: STAGES.ELIGIBILITY,
          stage_progress: {},
        }
      );
    } catch (error) {
      console.error("Error getting/creating application:", error);
      // Return minimal fallback
      return {
        id: null,
        wa_id: waId,
        current_stage: STAGES.ELIGIBILITY,
        stage_progress: {},
        completed_stages: [],
      };
    }
  }

  async saveApplication(application) {
    if (!application.id) return; // Can't save without ID

    const supabase = getSupabaseClient();
    try {
      const { error } = await supabase
        .from("bursary_applications")
        .update({
          ...application,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      if (error) {
        console.error("Failed to save application:", error);
      }
    } catch (error) {
      console.error("Save application error:", error);
    }
  }

  // ==================== ELIGIBILITY STAGE ====================
  async handleEligibility(userMessage, application) {
    const step = application.stage_progress?.eligibility_step || "start";

    if (step === "start") {
      application.stage_progress = { eligibility_step: "citizenship" };
      return "Let's see if you qualify for bursaries! 🎓\n\nAre you a South African citizen or permanent resident?\n\n1️⃣ Yes\n2️⃣ No";
    }

    if (step === "citizenship") {
      const isCitizen = /yes|1/i.test(userMessage);
      application.is_sa_citizen = isCitizen;

      if (!isCitizen) {
        application.status = "ineligible";
        return "Unfortunately, most South African bursaries require citizenship or permanent residency. 😔\n\nHowever, you can explore:\n• International scholarships\n• Study loans\n• Part-time work opportunities\n\nWould you like help with career guidance instead?";
      }

      application.stage_progress.eligibility_step = "academic_level";
      return "Great! ✅ What is your academic level?\n\n1️⃣ High school (Grade 10-12)\n2️⃣ First-time university applicant\n3️⃣ Current university student\n4️⃣ Postgraduate student";
    }

    if (step === "academic_level") {
      const levelMap = {
        1: "high_school",
        2: "first_year",
        3: "current_student",
        4: "postgrad",
      };
      application.academic_level =
        levelMap[userMessage.trim()] || "high_school";

      application.stage_progress.eligibility_step = "income";
      return "Perfect! 💰 What is your household's annual income?\n\n1️⃣ R0 - R350,000 (Qualifies for most bursaries)\n2️⃣ R350,000 - R600,000 (Moderate options)\n3️⃣ Above R600,000 (Limited options)";
    }

    if (step === "income") {
      const incomeMap = {
        1: "0-350k",
        2: "350k-600k",
        3: "600k+",
      };
      application.household_income_bracket =
        incomeMap[userMessage.trim()] || "0-350k";

      application.stage_progress.eligibility_step = "field";
      return "Almost done! 📚 What field of study are you interested in?\n\n1️⃣ STEM (Science, Tech, Engineering, Math)\n2️⃣ Commerce/Business\n3️⃣ Humanities/Arts\n4️⃣ Health Sciences\n5️⃣ Other";
    }

    if (step === "field") {
      const fieldMap = {
        1: "STEM",
        2: "Commerce",
        3: "Humanities",
        4: "Health Sciences",
        5: "Other",
      };
      application.field_of_study = fieldMap[userMessage.trim()] || "Other";

      application.stage_progress.eligibility_step = "disability";
      return "One more question: Do you have a disability?\n\n1️⃣ Yes\n2️⃣ No\n\n(This helps us find priority bursaries for you)";
    }

    if (step === "disability") {
      application.has_disability = /yes|1/i.test(userMessage);

      // Move to next stage
      application.current_stage = STAGES.PERSONAL;
      application.completed_stages = [STAGES.ELIGIBILITY];
      application.stage_progress = { personal_step: "start" };

      return `Excellent! ✅ You qualify for bursary applications.\n\n📋 Now let's collect your personal details.\n\nWhat is your full legal name? (As it appears on your ID)`;
    }

    return "I didn't understand that. Please choose a number from the options.";
  }

  // ==================== PERSONAL INFO STAGE ====================
  async handlePersonal(userMessage, application) {
    const step = application.stage_progress?.personal_step || "start";

    if (step === "start") {
      application.full_name = userMessage.trim();
      application.stage_progress.personal_step = "id_number";
      return `Thanks ${
        application.full_name.split(" ")[0]
      }! ✅\n\nWhat is your South African ID number? (13 digits)`;
    }

    if (step === "id_number") {
      const idNumber = userMessage.replace(/\s/g, "");

      if (!/^\d{13}$/.test(idNumber)) {
        return "That doesn't look like a valid ID number. Please enter 13 digits (e.g., 0012345678901)";
      }

      application.id_number = idNumber;

      // Extract date of birth from ID
      const year = parseInt(idNumber.substring(0, 2));
      const month = idNumber.substring(2, 4);
      const day = idNumber.substring(4, 6);
      const fullYear = year > 25 ? `19${year}` : `20${year}`;
      application.date_of_birth = `${fullYear}-${month}-${day}`;

      application.stage_progress.personal_step = "gender";
      return "Perfect! What is your gender?\n\n1️⃣ Male\n2️⃣ Female\n3️⃣ Other\n4️⃣ Prefer not to say";
    }

    if (step === "gender") {
      const genderMap = {
        1: "Male",
        2: "Female",
        3: "Other",
        4: "Prefer not to say",
      };
      application.gender = genderMap[userMessage.trim()] || "Prefer not to say";

      application.stage_progress.personal_step = "race";
      return "What is your race? (Required by SA equity laws)\n\n1️⃣ Black\n2️⃣ Coloured\n3️⃣ Indian\n4️⃣ White\n5️⃣ Other";
    }

    if (step === "race") {
      const raceMap = {
        1: "Black",
        2: "Coloured",
        3: "Indian",
        4: "White",
        5: "Other",
      };
      application.race = raceMap[userMessage.trim()] || "Other";

      application.stage_progress.personal_step = "language";
      return "What is your home language?\n\n1️⃣ English\n2️⃣ Afrikaans\n3️⃣ isiZulu\n4️⃣ isiXhosa\n5️⃣ Sesotho\n6️⃣ Other";
    }

    if (step === "language") {
      const languageMap = {
        1: "English",
        2: "Afrikaans",
        3: "isiZulu",
        4: "isiXhosa",
        5: "Sesotho",
        6: "Other",
      };
      application.home_language = languageMap[userMessage.trim()] || "Other";

      // Move to contact stage
      application.current_stage = STAGES.CONTACT;
      application.completed_stages = [
        ...(application.completed_stages || []),
        STAGES.PERSONAL,
      ];
      application.stage_progress = { contact_step: "start" };

      return `Great! ✅ Personal info saved.\n\n📞 Now for your contact details.\n\nWhat is your email address?`;
    }

    return "Please choose a number from the options.";
  }

  // ==================== CONTACT INFO STAGE ====================
  async handleContact(userMessage, application) {
    const step = application.stage_progress?.contact_step || "start";

    if (step === "start") {
      const email = userMessage.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "That doesn't look like a valid email. Please try again (e.g., student@example.com)";
      }

      application.email = email;
      application.phone_number = application.wa_id; // Already have this from WhatsApp

      application.stage_progress.contact_step = "address";
      return `Perfect! ✅ Email saved: ${email}\n\nNow, what is your physical address? (Street address, suburb, city)`;
    }

    if (step === "address") {
      application.physical_address = {
        full_address: userMessage.trim(),
        province: null, // Can extract with AI or ask separately
      };

      application.stage_progress.contact_step = "province";
      return "Which province do you live in?\n\n1️⃣ Gauteng\n2️⃣ Western Cape\n3️⃣ KwaZulu-Natal\n4️⃣ Eastern Cape\n5️⃣ Limpopo\n6️⃣ Mpumalanga\n7️⃣ North West\n8️⃣ Free State\n9️⃣ Northern Cape";
    }

    if (step === "province") {
      const provinceMap = {
        1: "Gauteng",
        2: "Western Cape",
        3: "KwaZulu-Natal",
        4: "Eastern Cape",
        5: "Limpopo",
        6: "Mpumalanga",
        7: "North West",
        8: "Free State",
        9: "Northern Cape",
      };
      application.physical_address.province =
        provinceMap[userMessage.trim()] || "Unknown";

      // Move to academic stage
      application.current_stage = STAGES.ACADEMIC;
      application.completed_stages = [
        ...(application.completed_stages || []),
        STAGES.CONTACT,
      ];
      application.stage_progress = { academic_step: "start" };

      return `Excellent! ✅ Contact details saved.\n\n🎓 Now let's talk about your academics.\n\n${
        application.academic_level === "high_school"
          ? "What grade are you in? (e.g., 10, 11, or 12)"
          : "What university are you attending or planning to attend?"
      }`;
    }

    return "Please provide your answer or choose a number from the options.";
  }

  // ==================== ACADEMIC INFO STAGE ====================
  async handleAcademic(userMessage, application) {
    const step = application.stage_progress?.academic_step || "start";
    const isHighSchool = application.academic_level === "high_school";

    if (step === "start") {
      if (isHighSchool) {
        application.current_grade = userMessage.trim();
        application.stage_progress.academic_step = "school_name";
        return "Great! What is the name of your school?";
      } else {
        application.preferred_universities = [userMessage.trim()];
        application.stage_progress.academic_step = "field_detail";
        return "Perfect! What specific degree/course are you pursuing? (e.g., Bachelor of Science in Computer Science)";
      }
    }

    if (step === "school_name") {
      application.school_name = userMessage.trim();
      application.stage_progress.academic_step = "average";
      return "What is your latest academic average? (percentage)";
    }

    if (step === "average") {
      const average = parseFloat(userMessage.trim());

      if (isNaN(average) || average < 0 || average > 100) {
        return "Please enter a valid percentage (0-100)";
      }

      application.academic_average = average;
      application.stage_progress.academic_step = "subjects";
      return "What are your top 3 subjects? (Separate with commas, e.g., Maths, Science, English)";
    }

    if (step === "subjects") {
      application.top_subjects = userMessage.split(",").map((s) => s.trim());

      if (isHighSchool) {
        application.stage_progress.academic_step = "universities";
        return "Which universities are you interested in? (Up to 3, separated by commas)";
      } else {
        application.stage_progress.academic_step = "complete";
        // Skip to financial
        application.current_stage = STAGES.FINANCIAL;
        application.completed_stages = [
          ...(application.completed_stages || []),
          STAGES.ACADEMIC,
        ];
        application.stage_progress = { financial_step: "start" };
        return `Awesome! ✅ Academic info saved.\n\n💰 Now let's talk about finances.\n\nWhat is your household's total annual income? (Estimate in Rands)`;
      }
    }

    if (step === "universities") {
      application.preferred_universities = userMessage
        .split(",")
        .map((u) => u.trim());

      // Move to financial stage
      application.current_stage = STAGES.FINANCIAL;
      application.completed_stages = [
        ...(application.completed_stages || []),
        STAGES.ACADEMIC,
      ];
      application.stage_progress = { financial_step: "start" };

      return `Excellent! ✅ Academic info complete.\n\n💰 Now for financial information.\n\nWhat is your household's total annual income? (Estimate in Rands)`;
    }

    return "Please provide your answer.";
  }

  // ==================== FINANCIAL INFO STAGE ====================
  async handleFinancial(userMessage, application) {
    const step = application.stage_progress?.financial_step || "start";

    if (step === "start") {
      const income = parseFloat(userMessage.replace(/[^\d.]/g, ""));

      if (isNaN(income)) {
        return "Please enter a number (e.g., 250000)";
      }

      application.household_income = income;
      application.stage_progress.financial_step = "dependents";
      return "How many people depend on this income? (Including you)";
    }

    if (step === "dependents") {
      const dependents = parseInt(userMessage.trim());

      if (isNaN(dependents) || dependents < 1) {
        return "Please enter a number (e.g., 4)";
      }

      application.num_dependents = dependents;
      application.stage_progress.financial_step = "nsfas";
      return "Are you currently receiving NSFAS funding?\n\n1️⃣ Yes\n2️⃣ No";
    }

    if (step === "nsfas") {
      application.receives_nsfas = /yes|1/i.test(userMessage);

      application.stage_progress.financial_step = "other_bursaries";
      return "Have you applied for any other bursaries this year?\n\n1️⃣ Yes\n2️⃣ No";
    }

    if (step === "other_bursaries") {
      const hasOther = /yes|1/i.test(userMessage);

      if (hasOther) {
        application.stage_progress.financial_step = "list_bursaries";
        return "Which bursaries have you applied for? (Separate with commas)";
      } else {
        application.other_bursaries = [];

        // Move to motivation stage
        application.current_stage = STAGES.MOTIVATION;
        application.completed_stages = [
          ...(application.completed_stages || []),
          STAGES.FINANCIAL,
        ];
        application.stage_progress = { motivation_step: "start" };

        return `Great! ✅ Financial info saved.\n\n✍️ Now the most important part: Your motivation.\n\nWhy do you need this bursary? Tell me about your challenges and why funding is important to you.`;
      }
    }

    if (step === "list_bursaries") {
      application.other_bursaries = userMessage.split(",").map((b) => b.trim());

      // Move to motivation stage
      application.current_stage = STAGES.MOTIVATION;
      application.completed_stages = [
        ...(application.completed_stages || []),
        STAGES.FINANCIAL,
      ];
      application.stage_progress = { motivation_step: "start" };

      return `Perfect! ✅ Financial details complete.\n\n✍️ Now the most important part: Your motivation.\n\nWhy do you need this bursary? Tell me about your challenges and why funding is important to you.`;
    }

    return "Please answer the question.";
  }

  // ==================== MOTIVATION STAGE ====================
  async handleMotivation(userMessage, application) {
    const step = application.stage_progress?.motivation_step || "start";

    if (step === "start") {
      application.motivation_text = userMessage.trim();
      application.stage_progress.motivation_step = "career_goals";
      return `Thank you for sharing that. 💙\n\nNow tell me: What are your career goals? What do you want to become?`;
    }

    if (step === "career_goals") {
      application.career_goals = userMessage.trim();
      application.stage_progress.motivation_step = "challenges";
      return "What challenges have you overcome to get where you are today?";
    }

    if (step === "challenges") {
      application.challenges_overcome = userMessage.trim();

      // Move to review stage
      application.current_stage = STAGES.REVIEW;
      application.completed_stages = [
        ...(application.completed_stages || []),
        STAGES.MOTIVATION,
      ];
      application.stage_progress = { review_step: "start" };

      return await this.generateReviewSummary(application);
    }

    return "Please share your response.";
  }

  // ==================== REVIEW STAGE ====================
  async handleReview(userMessage, application) {
    const response = userMessage.toLowerCase().trim();

    if (response.includes("submit") || response === "1") {
      // Submit application
      application.status = "submitted";
      application.submitted_at = new Date().toISOString();
      application.current_stage = STAGES.COMPLETE;

      // Generate AI-powered bursary matches
      const matches = await this.matchBursaries(application);
      application.matched_bursaries = matches;

      await this.saveApplication(application);

      return `🎉 Application submitted successfully!\n\nReference: ${
        application.application_ref || "PENDING"
      }\n\n📊 AI Matching Results:\n${this.formatMatches(
        matches
      )}\n\nWe'll send updates about these bursaries to ${
        application.email
      }.\n\nIs there anything else I can help with?`;
    }

    if (response.includes("edit") || response === "2") {
      return "Which section would you like to edit?\n\n1️⃣ Personal Info\n2️⃣ Contact Details\n3️⃣ Academic Info\n4️⃣ Financial Info\n5️⃣ Motivation\n\n(Note: Full editing coming soon. For now, you can restart by saying 'cancel application')";
    }

    if (response.includes("save") || response === "3") {
      return "Your application has been saved as a draft! ✅\n\nYou can continue anytime by saying 'continue application'.";
    }

    return "Please choose:\n\n1️⃣ Submit\n2️⃣ Edit\n3️⃣ Save Draft";
  }

  // ==================== HELPER METHODS ====================

  async generateReviewSummary(application) {
    // Calculate eligibility score
    const eligibilityScore = this.calculateEligibilityScore(application);

    const summary = `
╔══════════════════════════════════════╗
║   BURSARY APPLICATION SUMMARY        ║
╚══════════════════════════════════════╝

📋 APPLICATION ID: ${this.generateApplicationReference(application)}
📅 Date Submitted: ${new Date().toLocaleDateString("en-ZA")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 **APPLICANT PROFILE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full Name: ${application.full_name}
ID Number: ${this.maskID(application.id_number)}
Date of Birth: ${application.date_of_birth}
Age: ${this.calculateAge(application.date_of_birth)} years
Gender: ${application.gender}
Race: ${application.race}
Home Language: ${application.home_language}
Disability Status: ${
      application.has_disability ? "Yes (Priority Consideration)" : "No"
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 **CONTACT INFORMATION**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email: ${application.email}
Phone: ${application.phone_number}
Province: ${application.physical_address?.province}
Address: ${application.physical_address?.full_address}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 **ACADEMIC PROFILE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Level: ${this.getAcademicLevelDisplay(application.academic_level)}
${
  application.current_grade ? `Current Grade: ${application.current_grade}` : ""
}
${application.school_name ? `School: ${application.school_name}` : ""}
Field of Study: ${application.field_of_study}
Academic Average: ${application.academic_average}% ${this.getPerformanceBadge(
      application.academic_average
    )}
Top Subjects: ${(application.top_subjects || []).join(", ")}
${
  application.preferred_universities
    ? `Universities: ${application.preferred_universities.join(", ")}`
    : ""
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 **FINANCIAL PROFILE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Household Income: R${application.household_income?.toLocaleString("en-ZA")}/year
Income Bracket: ${this.getIncomeBracketDisplay(application.household_income)}
Dependents: ${application.num_dependents} people
Income per Dependent: R${Math.round(
      application.household_income / application.num_dependents
    ).toLocaleString("en-ZA")}/year
NSFAS Status: ${
      application.receives_nsfas ? "Currently Receiving" : "Not Receiving"
    }
Other Bursaries: ${
      application.other_bursaries?.length > 0
        ? application.other_bursaries.join(", ")
        : "None"
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️ **MOTIVATION & BACKGROUND**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Why I Need This Bursary:**
${application.motivation_text}

**Career Goals:**
${application.career_goals}

**Challenges Overcome:**
${application.challenges_overcome}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **ELIGIBILITY ASSESSMENT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Overall Score: ${eligibilityScore.total}/100 ${eligibilityScore.badge}

Breakdown:
${eligibilityScore.breakdown
  .map((b) => `  ${b.icon} ${b.criteria}: ${b.score}/${b.max} ${b.status}`)
  .join("\n")}

Priority Flags:
${this.generatePriorityFlags(application).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**What would you like to do?**

1️⃣ ✅ **Submit Application**
2️⃣ ✏️ **Edit Information**
3️⃣ 💾 **Save as Draft**
`;

    return summary.trim();
  }

  // Helper: Generate application reference
  generateApplicationReference(application) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const initials = application.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    return `FME-${initials}-${timestamp}`;
  }

  // Helper: Mask ID for privacy
  maskID(id) {
    if (!id || id.length < 6) return "****";
    return id.substring(0, 6) + "****" + id.substring(id.length - 1);
  }

  // Helper: Calculate age
  calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  }

  // Helper: Academic level display
  getAcademicLevelDisplay(level) {
    const map = {
      high_school: "High School Student",
      first_year: "First-Year University Applicant",
      current_student: "Current University Student",
      postgrad: "Postgraduate Student",
    };
    return map[level] || level;
  }

  // Helper: Performance badge
  getPerformanceBadge(average) {
    if (average >= 80) return "🌟 Outstanding";
    if (average >= 70) return "⭐ Excellent";
    if (average >= 60) return "✅ Good";
    if (average >= 50) return "👍 Pass";
    return "";
  }

  // Helper: Income bracket display
  getIncomeBracketDisplay(income) {
    if (income <= 350000) return "Low Income (High Priority)";
    if (income <= 600000) return "Middle Income (Moderate Priority)";
    return "High Income (Limited Options)";
  }

  // Helper: Calculate eligibility score
  calculateEligibilityScore(application) {
    const criteria = [
      {
        icon: "🇿🇦",
        criteria: "Citizenship",
        score: application.is_sa_citizen ? 10 : 0,
        max: 10,
        status: application.is_sa_citizen ? "✅ Eligible" : "❌ Not Eligible",
      },
      {
        icon: "💰",
        criteria: "Financial Need",
        score: this.calculateFinancialNeedScore(
          application.household_income,
          application.num_dependents
        ),
        max: 30,
        status: this.getFinancialNeedStatus(application.household_income),
      },
      {
        icon: "🎓",
        criteria: "Academic Performance",
        score: Math.round((application.academic_average / 100) * 25),
        max: 25,
        status: this.getAcademicStatus(application.academic_average),
      },
      {
        icon: "🎯",
        criteria: "Field of Study Priority",
        score: ["STEM", "Health Sciences"].includes(application.field_of_study)
          ? 15
          : 10,
        max: 15,
        status: ["STEM", "Health Sciences"].includes(application.field_of_study)
          ? "✅ Priority Field"
          : "⚠️ Standard",
      },
      {
        icon: "♿",
        criteria: "Disability Priority",
        score: application.has_disability ? 10 : 5,
        max: 10,
        status: application.has_disability ? "✅ Priority" : "Standard",
      },
      {
        icon: "✍️",
        criteria: "Motivation Quality",
        score: this.assessMotivationQuality(application.motivation_text),
        max: 10,
        status: "✅ Complete",
      },
    ];

    const total = criteria.reduce((sum, c) => sum + c.score, 0);

    let badge = "";
    if (total >= 85) badge = "🏆 Highly Competitive";
    else if (total >= 70) badge = "⭐ Competitive";
    else if (total >= 55) badge = "✅ Eligible";
    else badge = "⚠️ Needs Review";

    return { total, badge, breakdown: criteria };
  }

  // Helper: Financial need score (0-30)
  calculateFinancialNeedScore(income, dependents) {
    const perCapita = income / dependents;

    if (perCapita < 50000) return 30;
    if (perCapita < 100000) return 25;
    if (perCapita < 150000) return 20;
    if (perCapita < 200000) return 15;
    return 10;
  }

  // Helper: Financial need status
  getFinancialNeedStatus(income) {
    if (income <= 350000) return "✅ High Need";
    if (income <= 600000) return "⚠️ Moderate Need";
    return "❌ Low Need";
  }

  // Helper: Academic status
  getAcademicStatus(average) {
    if (average >= 75) return "✅ Excellent";
    if (average >= 60) return "✅ Good";
    if (average >= 50) return "⚠️ Pass";
    return "❌ Below Pass";
  }

  // Helper: Assess motivation quality (basic length check)
  assessMotivationQuality(text) {
    if (!text) return 0;
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount >= 100) return 10;
    if (wordCount >= 50) return 8;
    if (wordCount >= 20) return 6;
    return 4;
  }

  // Helper: Generate priority flags
  generatePriorityFlags(application) {
    const flags = [];

    if (application.has_disability) {
      flags.push("  🚩 **PRIORITY**: Applicant has a disability");
    }

    if (application.household_income / application.num_dependents < 50000) {
      flags.push("  🚩 **HIGH NEED**: Extremely low per-capita income");
    }

    if (application.academic_average >= 80) {
      flags.push("  ⭐ **EXCELLENCE**: Outstanding academic performance");
    }

    if (["STEM", "Health Sciences"].includes(application.field_of_study)) {
      flags.push("  🎯 **PRIORITY FIELD**: Critical skills sector");
    }

    if (!application.receives_nsfas && application.household_income < 350000) {
      flags.push("  ⚠️ **GAP**: Eligible for NSFAS but not receiving");
    }

    if (flags.length === 0) {
      flags.push("  ✅ Standard application (no special priority flags)");
    }

    return flags;
  }

  async matchBursaries(application) {
    // AI-powered bursary matching (simplified for MVP)
    const matches = [];

    // Rule-based matching (can be enhanced with OpenAI later)
    if (application.household_income < 350000) {
      matches.push({
        name: "NSFAS Bursary",
        match_score: 0.95,
        reason: "Household income qualifies",
      });
    }

    if (application.field_of_study === "STEM") {
      matches.push({
        name: "Sasol STEM Bursary",
        match_score: 0.88,
        reason: "STEM field of study",
      });
    }

    if (application.has_disability) {
      matches.push({
        name: "Disability Rights Fund",
        match_score: 0.92,
        reason: "Priority for students with disabilities",
      });
    }

    if (application.academic_average >= 70) {
      matches.push({
        name: "Allan Gray Orbis Foundation",
        match_score: 0.85,
        reason: "Strong academic performance",
      });
    }

    return matches.slice(0, 5); // Top 5 matches
  }

  formatMatches(matches) {
    if (!matches || matches.length === 0) {
      return "• We're still analyzing your profile for the best matches.";
    }

    return matches
      .map(
        (m, i) =>
          `${i + 1}. **${m.name}** (${Math.round(
            m.match_score * 100
          )}% match)\n   ${m.reason}`
      )
      .join("\n\n");
  }

  async cancelApplication(application) {
    application.status = "cancelled";
    await this.saveApplication(application);
  }

  async checkApplicationStatus(application) {
    if (application.status === "submitted") {
      return `Your application (Ref: ${
        application.application_ref
      }) is submitted! ✅\n\nMatched bursaries:\n${this.formatMatches(
        application.matched_bursaries
      )}`;
    }

    if (application.status === "draft") {
      const progress = Math.round(
        (application.completed_stages?.length / STAGE_ORDER.length) * 100
      );
      return `Your application is ${progress}% complete.\n\nCurrent stage: ${application.current_stage}\n\nSay 'continue' to pick up where you left off.`;
    }

    return "You don't have an active application. Say 'apply for bursary' to start!";
  }
}

module.exports = new ApplicationAgent();
