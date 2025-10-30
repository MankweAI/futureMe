const intentAnalyzer = require("./intent-analyzer");
const sessionManager = require("../session-manager");

// Agent imports
const conversationAgent = require("./conversation-agent");
const applicationAgent = require("./application-agent");
const profileAgent = require("./profile-agent");
const careerAgent = require("./career-agent");

/**
 * Determines which agent should handle the current user message based on intent.
 * @param {string} intent - The classified intent from intentAnalyzer.
 * @param {Object} session - The user's current session.
 * @returns {Object} The selected agent module.
 */
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
      // Default to the conversation agent for unrecognized intents
      return conversationAgent;
  }
}

/**
 * Main processing function for the brain agent.
 * @param {string} userMessage - The user's message.
 * @param {Object} session - The user's session object.
 * @returns {Promise<string>} The chatbot's response.
 */
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
  await sessionManager.saveSession(session);

  return response;
}

module.exports = {
  processMessage,
  agentName: "brain",
};
