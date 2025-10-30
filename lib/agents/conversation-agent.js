/**
 * Conversation Agent
 * Handles welcome messages, onboarding, and general conversation flow
 */
const { getOpenAIClient } = require("../config/openai");
const { getSession, updateSession } = require("../session-manager");

// Welcome messages
const FIRST_TIME_WELCOME =
  "Hey 👋 Welcome to The GOAT!\nYour expert tutor for Grades 8-12 CAPS curriculum subjects. Whether it's:\n✓ Homework help\n✓ Exam practice\n✓ Past paper questions\n✓ Understanding a tricky concept\nType your question—I got you! 📚";
const RETURNING_WELCOME =
  "Back again 👋 Ready for more? Drop a homework question, ask for tougher practice, or name a concept to unpack—I've got you. 🔁📚";

class ConversationAgent {
  constructor() {
    this.openai = getOpenAIClient();
  }

  /**
   * Process messages for conversation flow
   */
  async processMessage(userId, context) {
    const message = context.message || "";
    const sessionState = context.session_state || {};
    const userName = context.user_name || "Student";
    const userIntent = context.user_intent || {};

    // Get user session
    const session = await getSession(userId);

    // Handle initial welcome
    if (userIntent.category === "greeting" && !session.welcome_sent) {
      await updateSession(userId, {
        welcome_sent: true,
        conversation_stage: "welcome",
      });

      return {
        response: FIRST_TIME_WELCOME,
        next_expected: "subject_selection",
      };
    }

    // Handle returning user welcome
    if (
      userIntent.category === "greeting" &&
      session.welcome_sent &&
      session.has_received_help
    ) {
      return {
        response: RETURNING_WELCOME,
        next_expected: "intent_clarification",
      };
    }

    // Handle information gathering for subject/grade if needed
    if (!session.subject || !session.grade_detected) {
      return await this.gatherBasicInformation(message, session, userIntent);
    }

    // Handle general conversation
    return await this.generateConversationResponse(
      message,
      userName,
      session,
      userIntent
    );
  }

  /**
   * Gather basic user information like subject and grade
   */
  async gatherBasicInformation(message, session, userIntent) {
    // Update these variables to check intent first
    let needsGrade = !session.grade_detected && !userIntent.grade;
    let needsSubject = !session.subject && !userIntent.subject;

    // Extract from intent if available
    if (needsGrade && userIntent.grade && userIntent.grade !== "unknown") {
      needsGrade = false;
      await updateSession(session.user_id, {
        grade_detected: userIntent.grade,
      });
    }

    if (
      needsSubject &&
      userIntent.subject &&
      userIntent.subject !== "unknown"
    ) {
      needsSubject = false;
      await updateSession(session.user_id, {
        subject: userIntent.subject,
      });
    }

    // Use AI to generate appropriate follow-up instead of static responses
    const systemPrompt = `You are an educational AI assistant helping a student.
  Generate a friendly, concise response asking for the information you need.
  
  Current student context:
  - Has provided grade: ${!needsGrade}
  - Has provided subject: ${!needsSubject}
  - Message received: "${message}"
  
  Need to collect: ${needsGrade ? "grade, " : ""}${
      needsSubject ? "subject" : ""
    }
  
  Keep your response brief, conversational and suitable for WhatsApp with natural emoji use.
  Just ask about what's missing, don't repeat what you already know.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate appropriate follow-up question" },
        ],
        max_tokens: 150,
      });

      return {
        response: completion.choices[0].message.content,
        next_expected:
          needsGrade && needsSubject
            ? "subject_and_grade"
            : needsGrade
            ? "grade"
            : needsSubject
            ? "subject"
            : "intent_clarification",
      };
    } catch (error) {
      console.error("Dynamic response generation error:", error);

      // Only fall back to static responses if AI fails
      if (needsGrade && needsSubject) {
        return {
          response:
            "To help you better, could you tell me your grade and which subject you need help with?",
          next_expected: "subject_and_grade",
        };
      } else if (needsGrade) {
        return {
          response: `Which grade are you in? This helps me tailor content to your curriculum level.`,
          next_expected: "grade",
        };
      } else if (needsSubject) {
        return {
          response: `Which subject would you like help with? I'm familiar with Mathematics, Physical Sciences, Life Sciences, and other CAPS subjects.`,
          next_expected: "subject",
        };
      }

      // If we've gathered all needed info, ask what they'd like to do
      return {
        response: `Great! I can help you with Grade ${session.grade_detected} ${session.subject}. What would you like to do? You can ask for homework help, practice questions, or explanations of specific concepts.`,
        next_expected: "intent_clarification",
      };
    }
  }
  /**
   * Generate conversational response
   */
  async generateConversationResponse(message, userName, session, userIntent) {
    const systemPrompt = `You are a friendly educational AI assistant for South African CAPS curriculum.
You're having a conversation with ${userName}, a Grade ${
      session.grade_detected || "unknown"
    } student.

Respond in a helpful, educational manner that moves the conversation forward. 
Keep responses concise, friendly, and suitable for WhatsApp.
Use emoji naturally but sparingly.

Current conversation stage: ${
      userIntent.conversationStage || "ongoing_conversation"
    }
Subject focus: ${session.subject || "Not specified yet"}

Your goal is to understand what the student needs help with, then suggest the appropriate next step.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 250,
      });

      return {
        response: completion.choices[0].message.content,
        next_expected: "intent_clarification",
      };
    } catch (error) {
      console.error("Conversation response generation error:", error);
      return {
        response: `I'd like to help you with your ${
          session.subject || "studies"
        }. Could you tell me specifically what you need assistance with? For example, homework help, practice questions, or understanding a concept.`,
        next_expected: "intent_clarification",
        error: true,
      };
    }
  }
}

module.exports = new ConversationAgent();

