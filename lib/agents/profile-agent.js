// lib/agents/profile-agent.js
async function processMessage(userMessage, session) {
  return "Hello from the Profile Agent! You want to manage your profile.";
}

module.exports = {
  processMessage,
  agentName: "profile",
};
