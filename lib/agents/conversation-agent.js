// 1. --- THIS IS THE FIX ---
// We import the client object directly, not a non-existent function
const openai = require("../config/openai");
const { AGENT_NAMES, AGENT_MODES } = require("./agent-protocol");

const SYSTEM_PROMPT = `You are a friendly and helpful AI assistant for "FutureMe", a WhatsApp chatbot that helps South African youth with bursaries, career guidance, and profile management.
- Your role is for small talk and greetings.
- Be brief, friendly, and use emojis.
- If the user asks for help, or something you don't understand, guide them back to the main topics: "I can help you with Bursary Applications, Career Guidance, or managing your Profile. What would you like to do?"
- Do not answer educational questions about school subjects.
- Today's date is ${new Date().toISOString().split("T")[0]}.`;

class ConversationAgent {
  constructor() {
    this.agentName = AGENT_NAMES.CONVERSATION;
    this.agentMode = AGENT_MODES.IDLE;

    // 2. --- THIS IS THE FIX ---
    // We assign the imported client object directly
    this.openai = openai;
  }

  async handleGreeting(session) {
    // Simple, hard-coded greeting. No AI call needed.
    const welcomeMessage = `Hey there! 👋 Welcome to FutureMe. I can help with:\n\n1.  Bursary Applications\n2. Career Guidance\n3. My Profile\n\nWhat would you like to do?`;
    session.state.lastAgent = this.agentName;
    return welcomeMessage;
  }

  async handleSmallTalk(userMessage, session) {
    session.state.lastAgent = this.agentName;
    const history = [
      { role: "system", content: SYSTEM_PROMPT },
      ...session.history.slice(-6), // Get last 6 messages for context
      { role: "user", content: userMessage },
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: history,
        temperature: 0.7,
        max_tokens: 100,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Error in ConversationAgent small talk:", error);
      return "Sorry, I'm having a little trouble thinking right now. Could you try asking that again?";
    }
  }

  async processMessage(userMessage, session) {
    // If the intent is "greeting" or the history is empty, handle as a greeting.
    if (session.state.intent === "greeting" || session.history.length === 0) {
      return this.handleGreeting(session);
    }

    // Otherwise, handle as small talk
    return this.handleSmallTalk(userMessage, session);
  }
}

// Export a single instance of the agent
module.exports = new ConversationAgent();
