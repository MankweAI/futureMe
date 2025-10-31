async function processMessage(userMessage, session) {
  return "Hello from the Career Agent! You want career guidance.";
}

module.exports = {
  processMessage,
  agentName: "career",
};
