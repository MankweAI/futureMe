/**
 * Agent Protocol
 * Defines standard interfaces for agent communication and handoffs
 */

/**
 * Base Agent class with standardized interface
 */
class BaseAgent {
  constructor(agentId) {
    this.agentId = agentId;
    this.capabilities = [];
  }

  /**
   * Process a user message
   * @param {string} userId - User ID
   * @param {object} context - Message context
   * @returns {object} - Agent response
   */
  async processMessage(userId, context) {
    throw new Error("processMessage must be implemented by subclass");
  }

  /**
   * Standard handoff protocol for transferring to another agent
   * @param {string} targetAgent - Target agent ID
   * @param {string} userId - User ID
   * @param {object} context - Context to pass
   * @returns {object} - Handoff package
   */
  async handoff(targetAgent, userId, context) {
    console.log(
      `${this.agentId} handing off to ${targetAgent} for user ${userId}`
    );

    const handoffPackage = {
      source_agent: this.agentId,
      user_id: userId,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        handoff_reason: "Specialized assistance required",
        source_agent_state: this.getState(),
      },
    };

    return { handoff: true, target: targetAgent, package: handoffPackage };
  }

  /**
   * Get serializable state for handoffs
   * @returns {object} - Agent state
   */
  getState() {
    return {
      agent_id: this.agentId,
      capabilities: this.capabilities,
    };
  }
}

module.exports = { BaseAgent };

