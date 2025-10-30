// api/test-manychat.js
// ManyChat Integration Test Endpoint
// Copy this entire file exactly as shown

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({
      endpoint: "ManyChat Integration Test",
      message:
        "Send POST request with ManyChat webhook data to test your AI agents",
      developer: "tasimaditheto",

      example_request: {
        subscriber_id: "123456789",
        first_name: "Sarah",
        last_name: "Student",
        text: "Hi, I need help with my Grade 10 math homework",
        echo: "test_echo_12345",
      },

      ai_agents_ready: {
        brain_manager: "Ready to analyze student intent",
        homework_agent: "Ready for step-by-step problem solving",
        practice_agent: "Ready to generate CAPS questions",
        papers_agent: "Ready for exam preparation",
      },
    });
  }

  try {
    const manyChatData = req.body;

    console.log(
      "🧪 Testing ManyChat webhook with AI agents:",
      JSON.stringify(manyChatData, null, 2)
    );

    // Extract student info
    const studentInfo = {
      subscriber_id: manyChatData.subscriber_id || "unknown",
      name: `${manyChatData.first_name || "Student"} ${
        manyChatData.last_name || ""
      }`.trim(),
      message: manyChatData.text || "No message",
      echo: manyChatData.echo || "no_echo",
    };

    // 🧠 SIMULATE AI BRAIN MANAGER ANALYSIS
    const brainAnalysis = await simulateBrainManager(
      studentInfo.message,
      studentInfo.name
    );

    // 🎓 ROUTE TO APPROPRIATE AGENT
    const agentResponse = await simulateAgentResponse(
      brainAnalysis,
      studentInfo
    );

    // 📤 FORMAT MANYCHAT RESPONSE WITH ECHO
    const manyChatResponse = {
      echo: studentInfo.echo, // CRITICAL: Return the echo for ManyChat
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: agentResponse.message_text,
          },
        ],
        quick_replies: agentResponse.quick_replies || [],
      },

      // Debug info showing AI agents coordination
      ai_agents_coordination: {
        brain_analysis: brainAnalysis,
        agent_used: agentResponse.agent,
        caps_aligned: true,
        conversation_flow: "natural_whatsapp",
      },

      test_mode: true,
      timestamp: new Date().toISOString(),
    };

    console.log("✅ AI Agents processed ManyChat test successfully");
    console.log("📤 Returning response with echo:", studentInfo.echo);

    return res.status(200).json(manyChatResponse);
  } catch (error) {
    console.error("❌ ManyChat AI agents test error:", error);

    return res.status(200).json({
      echo: req.body?.echo || "error_echo",
      version: "v2",
      content: {
        messages: [
          {
            type: "text",
            text: "I'm having trouble processing your request right now. Please try again! 🤖",
          },
        ],
      },
      error_details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// 🧠 SIMULATE AI BRAIN MANAGER
async function simulateBrainManager(message, studentName) {
  console.log(`🧠 Brain Manager analyzing: "${message}" from ${studentName}`);

  const lowerMessage = message.toLowerCase();

  // Intent detection logic
  let intent = {
    category: "general_query",
    confidence: 0.7,
    recommended_agent: "conversation_manager",
  };

  // Homework help detection
  if (
    lowerMessage.includes("homework") ||
    lowerMessage.includes("help") ||
    lowerMessage.includes("solve") ||
    lowerMessage.includes("explain")
  ) {
    intent = {
      category: "homework_help",
      confidence: 0.9,
      recommended_agent: "homework",
      detected_keywords: ["homework", "help"],
    };
  }

  // Practice questions detection
  else if (
    lowerMessage.includes("practice") ||
    lowerMessage.includes("questions") ||
    lowerMessage.includes("quiz") ||
    lowerMessage.includes("test")
  ) {
    intent = {
      category: "practice_questions",
      confidence: 0.9,
      recommended_agent: "practice",
      detected_keywords: ["practice", "questions"],
    };
  }

  // Past papers detection
  else if (
    lowerMessage.includes("past") ||
    lowerMessage.includes("papers") ||
    lowerMessage.includes("exam") ||
    lowerMessage.includes("previous")
  ) {
    intent = {
      category: "past_papers",
      confidence: 0.8,
      recommended_agent: "papers",
      detected_keywords: ["past", "papers"],
    };
  }

  // Greeting detection
  else if (
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hey") ||
    lowerMessage.includes("start")
  ) {
    intent = {
      category: "greeting",
      confidence: 0.9,
      recommended_agent: "conversation_manager",
      detected_keywords: ["greeting"],
    };
  }

  // Subject and grade detection
  let subject = "unknown";
  let grade = "unknown";

  if (lowerMessage.includes("math")) subject = "Mathematics";
  if (lowerMessage.includes("science")) subject = "Physical Science";
  if (lowerMessage.includes("english")) subject = "English";

  const gradeMatch = lowerMessage.match(/grade (\d+)/);
  if (gradeMatch) grade = gradeMatch[1];

  return {
    intent_category: intent.category,
    confidence: intent.confidence,
    recommended_agent: intent.recommended_agent,
    subject_detected: subject,
    grade_detected: grade,
    reasoning: `Analyzed "${message}" and detected ${
      intent.category
    } with ${Math.round(intent.confidence * 100)}% confidence`,
    brain_decision: `Routing to ${intent.recommended_agent} agent for specialized assistance`,
  };
}

// 🎓 SIMULATE SPECIALIZED AGENT RESPONSE
async function simulateAgentResponse(brainAnalysis, studentInfo) {
  const agent = brainAnalysis.recommended_agent;
  const studentName = studentInfo.name;

  console.log(`🎓 ${agent} agent taking over for ${studentName}`);

  switch (agent) {
    case "homework":
      return {
        agent: "homework",
        message_text: `Great! I can help with your homework, ${studentName}! 📚\n\nI'm your specialized homework agent with expertise in:\n• Step-by-step problem solving\n• CAPS curriculum alignment\n• Concept explanations\n\nPlease share your specific homework question and I'll guide you through it!`,
        quick_replies: [
          { title: "📐 Mathematics", payload: "subject_math" },
          { title: "🔬 Physical Science", payload: "subject_science" },
          { title: "📖 English", payload: "subject_english" },
        ],
      };

    case "practice":
      return {
        agent: "practice",
        message_text: `Perfect! I'll create practice questions for you, ${studentName}! 📝\n\nI'm your practice questions specialist, and I can:\n• Generate CAPS-aligned questions\n• Adjust difficulty levels\n• Create topic-specific exercises\n\nWhat subject and grade level would you like to practice?`,
        quick_replies: [
          { title: "Grade 8-9", payload: "grade_junior" },
          { title: "Grade 10-11", payload: "grade_senior" },
          { title: "Grade 12", payload: "grade_matric" },
        ],
      };

    case "papers":
      return {
        agent: "papers",
        message_text: `Excellent! I can help you with past exam papers, ${studentName}! 📄\n\nI'm your exam preparation specialist offering:\n• Past NSC exam papers\n• Memorandums and marking guidelines\n• Exam strategies and tips\n\nWhat grade and subject papers do you need?`,
        quick_replies: [
          { title: "📐 Math Papers", payload: "papers_math" },
          { title: "🔬 Science Papers", payload: "papers_science" },
          { title: "📖 English Papers", payload: "papers_english" },
        ],
      };

    case "conversation_manager":
    default:
      if (brainAnalysis.intent_category === "greeting") {
        return {
          agent: "conversation_manager",
          message_text: `Hello ${studentName}! 👋\n\nWelcome to your CAPS curriculum AI tutor! I'm powered by specialized AI agents who work together to help you:\n\n📚 Homework Help - Step-by-step solutions\n📝 Practice Questions - Custom CAPS questions\n📄 Past Papers - Exam preparation\n\nWhat would you like help with today?`,
          quick_replies: [
            { title: "📚 Homework Help", payload: "homework_help" },
            { title: "📝 Practice Questions", payload: "practice_questions" },
            { title: "📄 Past Papers", payload: "past_papers" },
          ],
        };
      } else {
        return {
          agent: "conversation_manager",
          message_text: `Hi ${studentName}! I want to help you with your studies. 🎓\n\nMy AI agents can assist with:\n• Homework questions (any subject)\n• Practice exercises\n• Past exam papers\n\nWhat specific help do you need today?`,
          quick_replies: [
            { title: "📚 Homework Help", payload: "homework_help" },
            { title: "📝 Practice Questions", payload: "practice_questions" },
            { title: "📄 Past Papers", payload: "past_papers" },
          ],
        };
      }
  }
}

// Export for Vercel
module.exports.default = module.exports;
