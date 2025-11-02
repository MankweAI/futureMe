/**
 * Defines the names of all agents in the TTI Bursaries system.
 */
const AGENT_NAMES = {
  BRAIN: "brain",
  CONVERSATION: "conversation",
  APPLICATION: "application",
  PROFILE: "profile",
  CAREER: "career",
};

/**
 * Defines the possible modes an agent can be in.
 */
const AGENT_MODES = {
  IDLE: "idle", // Waiting for a new task
  PROCESSING: "processing", // Actively handling a multi-step task
  // We can add more specific modes later, e.g., 'APPLYING_FOR_BURSARY'
};

module.exports = {
  AGENT_NAMES,
  AGENT_MODES,
};
