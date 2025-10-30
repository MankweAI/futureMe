// api/tutor.js
// EDUCATIONAL AGENTS - Homework, Practice, Papers
// Copy this entire file exactly as shown
const {
  generateHomeworkScaffoldAI,
  generateConceptExplanationAI,
  generateExamPrepPackAI,
} = require("../lib/ai-generators");

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      endpoint: "Educational Tutor Agents",
      status: "✅ All agents ready!",
      developer: "tasimaditheto",
      agents: {
        homework: "Step-by-step homework problem solver",
        practice: "CAPS-aligned practice questions generator",
        papers: "Past exam papers and memorandums specialist",
        profile: "Student learning profile manager",
      },
      example:
        'POST { "agent": "homework", "user_name": "Sarah", "homework_question": "Solve x + 5 = 10" }',
    });
  }

  if (req.method === "POST") {
    try {
      const {
        agent = "homework",
        user_name = "Student",
        homework_question = "",
        subject = "Mathematics",
        grade = "10",
        topic = "",
        message = "",
      } = req.body;

      console.log(`🎓 ${agent} agent helping ${user_name}`);

      let response;

if (agent === "homework") {
  response = await handleHomeworkAgent({
    user_name,
    homework_question,
    subject,
    grade,
    topic,
    message,
  });
} else if (agent === "practice") {
  response = await handlePracticeAgent({
    user_name,
    subject,
    grade,
    topic,
  });
} else if (agent === "papers") {
  response = await handlePastPapersAgent({
    user_name,
    subject,
    grade,
  });
} else {
  response = {
    error: "Unknown agent",
    available_agents: ["homework", "practice", "papers", "profile"],
    example:
      'Use: { "agent": "homework", "user_name": "Sarah", "homework_question": "Help with math" }',
  };
}

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        agent_used: agent,
        tutor_status: "success",
        developer: "tasimaditheto",
        ...response,
      });
    } catch (error) {
      console.error("❌ Tutor error:", error);
      return res.status(500).json({
        error: "Tutor processing failed",
        agent: req.body.agent || "unknown",
        details: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

// HOMEWORK AGENT HANDLER
async function handleHomeworkAgent(data) {
  const { user_name, homework_question, subject, grade, topic, message } = data;
  const question = homework_question || message || "No question provided";

  const hw = await generateHomeworkScaffoldAI({
    subject,
    grade,
    topic: topic || "Algebra",
    question,
    userName: user_name,
  });

  return {
    agent: "homework",
    specialist: "Step-by-step problem solver (AI)",
    user_info: {
      user_name,
      subject,
      grade: `Grade ${grade}`,
      question,
    },
    scaffold_text: hw.text,
    caps_alignment: `CAPS aligned (${subject} Grade ${grade})`,
    next_steps: {
      can_request_more: true,
      can_ask_concept: true,
      can_switch_topic: true,
    },
  };
}

// PRACTICE AGENT HANDLER
async function handlePracticeAgent(data) {
  const { user_name, subject, grade, topic } = data;
  const pack = await generateExamPrepPackAI({
    subject,
    grade,
    topic: topic || "Algebra",
    difficulty: "mixed",
  });
  return {
    agent: "practice",
    specialist: "CAPS practice (AI)",
    user_info: {
      user_name,
      subject,
      grade: `Grade ${grade}`,
      topic: topic || "General",
    },
    practice_pack_text: pack.text,
    question_ids: pack.question_ids,
    next_steps: {
      can_request_more: true,
      can_switch_topic: true,
      can_ask_concept: true,
    },
  };
}

// PAST PAPERS AGENT HANDLER
async function handlePastPapersAgent(data) {
  const { user_name, subject, grade } = data;
  // For now reuse exam prep generator (you can later differentiate with past paper style)
  const pack = await generateExamPrepPackAI({
    subject,
    grade,
    topic: "Mixed",
    difficulty: "mixed",
  });
  return {
    agent: "past_papers",
    specialist: "Exam preparation specialist (AI)",
    user_info: { user_name, subject, grade: `Grade ${grade}` },
    exam_preview_text: pack.text,
    mode: "simulated_past_paper",
    next_steps: {
      can_request_memorandum: true,
      can_request_more: true,
      can_focus_topic: true,
    },
  };
}

// PROFILE AGENT HANDLER
function handleProfileAgent(data) {
  const { user_name, grade, subject } = data;

  return {
    agent: "profile",
    specialist: "Learning profile manager",
    user_profile: {
      user_name: user_name,
      grade: `Grade ${grade}`,
      primary_subject: subject,
      learning_style: "Visual and step-by-step",
      strengths: ["Problem-solving approach"],
      areas_for_improvement: ["Will be identified through usage"],
      caps_progress: "Starting assessment",
    },
    personalized_recommendations: {
      study_schedule: "Regular practice sessions recommended",
      focus_areas: [`${subject} problem-solving techniques`],
      next_goals: ["Complete homework efficiently", "Master key concepts"],
    },
    next_steps: {
      can_update_profile: true,
      can_set_goals: true,
      can_track_progress: true,
    },
  };
}

