// lib/agents/brain-agent.js
const intentAnalyzer = require("./intent-analyzer");
const sessionManager = require("../session-manager");

// Agent imports
const conversationAgent = require("./conversation-agent");
const applicationAgent = require("./application-agent");
const profileAgent = require("./profile-agent");
const careerAgent = require("./career-agent");

function determineTargetAgent(intent, session) {
  switch (intent) {
    case "bursary_application":
      return applicationAgent;
    case "view_profile":
      return profileAgent;
    case "career_guidance":
      return careerAgent;
    case "greeting":
      return conversationAgent;
    case "unknown":
    default:
      return conversationAgent;
  }
}

async function processMessage(userMessage, session) {
  // 1. Analyze intent
  const intent = await intentAnalyzer.analyzeIntent(
    userMessage,
    session.history
  );
  session.state.intent = intent;

  // 2. Determine target agent
  const targetAgent = determineTargetAgent(intent, session);
  session.state.lastAgent = targetAgent.agentName || "brain";

  // 3. Delegate to target agent
  const response = await targetAgent.processMessage(userMessage, session);

  // 4. Update session
  session.history.push({ role: "assistant", content: response });

  // ✅ FIX: Use updateSession instead of saveSession
  await sessionManager.updateSession(session.wa_id || session.user_id, {
    history: session.history,
    state: session.state,
  });

  return response;
}

module.exports = {
  processMessage,
  agentName: "brain",
};
