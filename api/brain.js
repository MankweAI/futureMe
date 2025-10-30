// api/brain.js
// AI BRAIN - True Agent Manager for WhatsApp AI Tutor
// Copy this entire file exactly as shown

const { getOpenAIClient } = require("../lib/config/openai");

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
      endpoint: "AI Brain - Agent Manager",
      status: "✅ Brain is working perfectly!",
      description: "AI Agent Manager for CAPS curriculum WhatsApp tutoring",
      developer: "tasimaditheto",
      actions: ["test", "analyze", "conversation", "experience"],
      example:
        'POST { "action": "analyze", "user_id": "student123", "message": "I need help with homework" }',
    });
  }

  if (req.method === "POST") {
    try {
      const {
        action = "test",
        message = "Hello",
        user_name = "Student",
        user_id = "user123",
      } = req.body;

      console.log(`🧠 Brain processing: ${action} from ${user_name}`);

      let response;

      if (action === "test") {
        response = {
          brain_test: "SUCCESS",
          message_received: message,
          user_name: user_name,
          brain_response: `Hello ${user_name}! 🧠 AI Brain is working perfectly! Ready to route you to the best educational agent.`,
          timestamp: new Date().toISOString(),
        };
      } else if (action === "analyze") {
        // Use real AI to analyze student message
        const intent = await analyzeMessageWithAI(message, user_name);
        const recommendedAgent = await determineAgentWithAI(intent, message);

        response = {
          user_info: { user_id, user_name, message },
          ai_analysis: {
            intent_detected: intent.category,
            subject_detected: intent.subject,
            grade_detected: intent.grade,
            urgency_level: intent.urgency,
            confidence: intent.confidence,
          },
          agent_decision: {
            recommended_agent: recommendedAgent.agent,
            agent_specialties: recommendedAgent.specialties,
            handoff_ready: true,
            reasoning: `Based on AI analysis of "${message}", detected ${intent.category} intent`,
          },
          brain_response: await generateBrainResponseWithAI(
            message,
            user_name,
            recommendedAgent
          ),
        };
      } else if (action === "conversation") {
        // Use real AI for conversation
        const conversationStage = await determineConversationStageWithAI(
          message
        );
        const aiResponse = await generateConversationResponseWithAI(
          message,
          user_name,
          conversationStage
        );

        response = {
          conversation_flow: "active",
          user_info: { user_id, user_name },
          conversation_stage: conversationStage,
          whatsapp_response: {
            message_text: aiResponse,
            message_type: "text",
            follow_up_expected: true,
          },
        };
      } else if (action === "experience") {
        // Generate real AI conversation simulation
        const simulatedConversation = await simulateWhatsAppConversationWithAI(
          user_name,
          message
        );

        response = {
          whatsapp_experience: "simulation_active",
          student_name: user_name,
          simulated_conversation: simulatedConversation,
          ai_coordination: {
            agents_working: [
              "conversation_manager",
              "agent_router",
              "context_memory",
            ],
            natural_flow: true,
            caps_aligned: true,
          },
        };
      } else {
        response = {
          unknown_action: action,
          available_actions: ["test", "analyze", "conversation", "experience"],
          default_response: `Hi ${user_name}! I received your message: "${message}". Please use a valid action.`,
        };
      }

      return res.status(200).json({
        timestamp: new Date().toISOString(),
        action_processed: action,
        brain_status: "working",
        developer: "tasimaditheto",
        ...response,
      });
    } catch (error) {
      console.error("❌ Brain error:", error);
      return res.status(500).json({
        error: "Brain processing failed",
        details: error.message,
        note: "AI Brain system encountered an error",
        timestamp: new Date().toISOString(),
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};

// REAL AI MESSAGE ANALYSIS
async function analyzeMessageWithAI(message, userName) {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are an AI education specialist analyzing a student message for intent.
          
Response format (JSON):
{
  "category": "homework_help|practice_questions|exam_preparation|greeting|general_query",
  "subject": "subject name or unknown",
  "grade": "detected grade or unknown",
  "urgency": "low|medium|high",
  "confidence": 0.1-1.0,
  "reasoning": "brief explanation of your analysis"
}

Analyze this WhatsApp message for educational needs:`,
        },
        {
          role: "user",
          content: `Student ${userName} says: "${message}"`,
        },
      ],
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("AI analysis error:", error);
    return {
      category: "general_query",
      subject: "unknown",
      grade: "unknown",
      urgency: "medium",
      confidence: 0.7,
      reasoning: "Fallback due to AI processing error",
    };
  }
}

// REAL AI AGENT DETERMINATION
async function determineAgentWithAI(intent, message) {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are an AI education coordinator determining which specialized agent should help a student.

Available agents:
1. Homework Agent - Step-by-step solutions and problem breakdown
2. Practice Agent - CAPS-aligned practice questions generator
3. Past Papers Agent - Exam papers and memorandums specialist
4. Conversation Manager - Natural dialogue and student needs assessment

Response format (JSON):
{
  "agent": "Homework Agent|Practice Agent|Past Papers Agent|Conversation Manager",
  "specialties": ["specialty1", "specialty2", "specialty3"],
  "reasoning": "brief explanation of your decision"
}

Based on this intent analysis and message, determine the most appropriate agent:`,
        },
        {
          role: "user",
          content: `Intent: ${JSON.stringify(intent)}
Student message: "${message}"`,
        },
      ],
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("AI agent determination error:", error);
    return {
      agent: "Conversation Manager",
      specialties: ["Fallback handling", "Need assessment", "Agent routing"],
      reasoning: "Fallback due to AI processing error",
    };
  }
}

// REAL AI BRAIN RESPONSE GENERATION
async function generateBrainResponseWithAI(
  message,
  userName,
  recommendedAgent
) {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 150,
      messages: [
        {
          role: "system",
          content: `You are the AI Brain Manager for a WhatsApp AI tutor system. Generate a brief, friendly response to the student
explaining that you've analyzed their request and are routing them to the appropriate specialist.

Context:
- Student name: ${userName}
- Student message: "${message}"
- Recommended agent: ${recommendedAgent.agent}
- Agent specialties: ${recommendedAgent.specialties.join(", ")}

Your response should be conversational, encouraging, and suitable for WhatsApp (using emojis naturally).
Keep it under 100 words.`,
        },
        {
          role: "user",
          content: `Create a brain manager response for ${userName} about their request: "${message}"`,
        },
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("AI brain response error:", error);
    return `I've analyzed your request about "${message}" and I'm connecting you with our ${recommendedAgent.agent} who specializes in this area. They'll help you right away!`;
  }
}

// REAL AI CONVERSATION STAGE DETERMINATION
async function determineConversationStageWithAI(message) {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 50,
      messages: [
        {
          role: "system",
          content: `Determine the conversation stage from this WhatsApp message. 
Response options: "greeting", "homework_request", "practice_request", "information_gathering".
Respond with just one word - the conversation stage.`,
        },
        {
          role: "user",
          content: `Message: "${message}"`,
        },
      ],
    });

    return completion.choices[0].message.content.trim().toLowerCase();
  } catch (error) {
    console.error("AI conversation stage error:", error);
    // Fallback based on simple pattern matching
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("hi") || lowerMessage.includes("hello")) {
      return "greeting";
    } else if (lowerMessage.includes("homework")) {
      return "homework_request";
    } else if (lowerMessage.includes("practice")) {
      return "practice_request";
    } else {
      return "information_gathering";
    }
  }
}

// REAL AI CONVERSATION RESPONSE
async function generateConversationResponseWithAI(
  message,
  userName,
  conversationStage
) {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 250,
      messages: [
        {
          role: "system",
          content: `You are an AI tutor for South African CAPS curriculum. Generate a WhatsApp response for a student.

Student context:
- Name: ${userName}
- Message: "${message}"
- Conversation stage: ${conversationStage}

Your response should:
- Be conversational and friendly
- Use emojis naturally (this is WhatsApp)
- Be helpful and educational
- Mention CAPS curriculum relevance where appropriate
- Ask appropriate follow-up questions based on the conversation stage
- Keep it under 150 words

For greeting: Welcome them and explain what you can help with
For homework_request: Ask for specific details (subject, grade, question)
For practice_request: Ask for subject, grade, and topic preferences
For information_gathering: Ask clarifying questions to understand their needs better`,
        },
        {
          role: "user",
          content: `Generate a ${conversationStage} response for ${userName}'s message: "${message}"`,
        },
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("AI conversation response error:", error);
    // Use minimal fallbacks for critical failure cases
    if (conversationStage === "greeting") {
      return `Hello ${userName}! 👋 I'm your CAPS curriculum AI tutor. I can help with homework, practice questions, and past papers. What do you need help with today?`;
    } else {
      return `Hi ${userName}! I'd love to help you. Could you share more details about what you need? For example, your subject, grade level, and specific question?`;
    }
  }
}

// REAL AI WHATSAPP CONVERSATION SIMULATION
async function simulateWhatsAppConversationWithAI(studentName, scenario) {
  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `Simulate a realistic WhatsApp conversation between a student and AI tutor for South African CAPS curriculum.

Format the conversation as a JSON array with this structure:
[
  {
    "sender": "student|ai_tutor",
    "message": "message text",
    "time": "HH:MM"
  },
  // more messages
]

The conversation should:
- Start with the student asking about ${scenario || "homework help"}
- Show realistic back-and-forth (4-6 messages total)
- Include the AI tutor asking clarifying questions
- Show the AI tutor providing helpful educational guidance
- Use natural WhatsApp style (brief messages, emojis)
- Reference CAPS curriculum
- Use the student name: ${studentName}

Create a realistic, helpful educational conversation.`,
        },
        {
          role: "user",
          content: `Simulate a WhatsApp conversation with student ${studentName} about ${
            scenario || "homework help"
          }`,
        },
      ],
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error("AI conversation simulation error:", error);
    // Fallback with minimal simulated conversation
    return [
      {
        sender: "student",
        message: `Hi, I need help with my ${scenario || "homework"}`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      {
        sender: "ai_tutor",
        message: `Hello ${studentName}! I'd be happy to help with your ${
          scenario || "homework"
        }. What subject and grade are you working on?`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      {
        sender: "student",
        message: "I'm in Grade 10, working on Mathematics",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
      {
        sender: "ai_tutor",
        message: `Great! I'm familiar with the Grade 10 Mathematics CAPS curriculum. What specific topic or problem do you need help with?`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  }
}
