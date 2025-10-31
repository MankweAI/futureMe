async function processMessage(userMessage, session) {
  return "Hello from the Application Agent! You want to apply for a bursary.";
}

module.exports = {
  processMessage,
  agentName: "application",
};
