/**
 * Agent State Manager
 * Manages state transitions between AI agents and maintains context during handoffs
 */
const { getSession, updateSession } = require("../session-manager");

class AgentStateManager {
  constructor() {
    this.agentStates = new Map();
    this.handoffHistory = new Map();
  }

  /**
   * Get current agent state for a user
   * @param {string} agentId - ID of the agent
   * @param {string} userId - ID of the user
   * @returns {object} - Current agent state
   */
  getAgentState(agentId, userId) {
    const key = this.getStateKey(agentId, userId);

    if (!this.agentStates.has(key)) {
      this.agentStates.set(key, {
        agent_id: agentId,
        user_id: userId,
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        state: "initialized",
        context: {},
        conversation_turns: 0,
      });
    }

    return this.agentStates.get(key);
  }

  /**
   * Update agent state for a user
   * @param {string} agentId - ID of the agent
   * @param {string} userId - ID of the user
   * @param {object} update - State update object
   * @returns {object} - Updated agent state
   */
  updateAgentState(agentId, userId, update) {
    const key = this.getStateKey(agentId, userId);
    const currentState = this.getAgentState(agentId, userId);

    const updatedState = {
      ...currentState,
      ...update,
      last_updated: new Date().toISOString(),
    };

    this.agentStates.set(key, updatedState);

    return updatedState;
  }

  /**
   * Record a handoff from one agent to another
   * @param {string} userId - ID of the user
   * @param {string} fromAgent - Source agent ID
   * @param {string} toAgent - Target agent ID
   * @param {object} handoffContext - Context to pass to target agent
   * @returns {boolean} - Success status
   */
  async recordHandoff(userId, fromAgent, toAgent, handoffContext) {
    // Generate handoff key
    const handoffKey = `${userId}:${fromAgent}:${toAgent}:${Date.now()}`;

    // Store handoff details
    this.handoffHistory.set(handoffKey, {
      user_id: userId,
      from_agent: fromAgent,
      to_agent: toAgent,
      timestamp: new Date().toISOString(),
      context: handoffContext || {},
    });

    // Update user session with handoff record
    try {
      const session = await getSession(userId);

      await updateSession(userId, {
        last_agent_handoff: {
          from: fromAgent,
          to: toAgent,
          timestamp: new Date().toISOString(),
        },
        agent_handoff_history: [
          ...(session.agent_handoff_history || []),
          {
            from: fromAgent,
            to: toAgent,
            timestamp: new Date().toISOString(),
          },
        ].slice(-5), // Keep last 5 handoffs
      });

      // Initialize state for target agent if needed
      this.getAgentState(toAgent, userId);

      return true;
    } catch (error) {
      console.error("Handoff recording error:", error);
      return false;
    }
  }

  /**
   * Prepare handoff context from one agent to another
   * @param {string} userId - ID of the user
   * @param {string} fromAgent - Source agent ID
   * @param {string} toAgent - Target agent ID
   * @param {object} userData - User data and message
   * @param {object} additionalContext - Additional context to include
   * @returns {object} - Handoff context package
   */
  prepareHandoffContext(
    userId,
    fromAgent,
    toAgent,
    userData,
    additionalContext = {}
  ) {
    const sourceAgentState = this.getAgentState(fromAgent, userId);

    return {
      handoff_id: `${userId}_${Date.now()}`,
      from_agent: fromAgent,
      to_agent: toAgent,
      timestamp: new Date().toISOString(),
      user_data: userData,
      source_agent_context: sourceAgentState.context,
      additional_context: additionalContext,
      conversation_state: {
        turns: sourceAgentState.conversation_turns,
        current_state: sourceAgentState.state,
      },
    };
  }

  /**
   * Increment conversation turns for an agent
   * @param {string} agentId - ID of the agent
   * @param {string} userId - ID of the user
   * @returns {object} - Updated agent state
   */
  incrementConversationTurns(agentId, userId) {
    const key = this.getStateKey(agentId, userId);
    const currentState = this.getAgentState(agentId, userId);

    const updatedState = {
      ...currentState,
      conversation_turns: (currentState.conversation_turns || 0) + 1,
      last_updated: new Date().toISOString(),
    };

    this.agentStates.set(key, updatedState);

    return updatedState;
  }

  /**
   * Determine if handoff is needed based on user message
   * @param {string} currentAgentId - Current agent ID
   * @param {string} userId - User ID
   * @param {string} message - User message
   * @returns {object} - Handoff recommendation
   */
  async determineHandoffNeeded(currentAgentId, userId, message) {
    try {
      // Get user session
      const session = await getSession(userId);
      const currentAgentState = this.getAgentState(currentAgentId, userId);

      // Analyze message for topic switches
      const topicSwitch = this.detectTopicSwitch(message);
      const requestType = this.detectRequestType(message);

      // Check for explicit agent requests
      if (
        message.toLowerCase().includes("practice") &&
        currentAgentId !== "practice_agent"
      ) {
        return {
          handoff_needed: true,
          target_agent: "practice_agent",
          reason: "User explicitly requested practice questions",
          confidence: 0.9,
        };
      }

      if (
        message.toLowerCase().includes("homework") &&
        currentAgentId !== "homework_agent"
      ) {
        return {
          handoff_needed: true,
          target_agent: "homework_agent",
          reason: "User explicitly requested homework help",
          confidence: 0.9,
        };
      }

      if (
        /exam|paper/.test(message.toLowerCase()) &&
        currentAgentId !== "exam_agent"
      ) {
        return {
          handoff_needed: true,
          target_agent: "exam_agent",
          reason: "User explicitly requested exam preparation",
          confidence: 0.9,
        };
      }

      // Check for topic switches requiring specialized agents
      if (topicSwitch && session.subject && session.grade_detected) {
        return {
          handoff_needed: true,
          target_agent: `${session.subject.toLowerCase()}_grade_${
            session.grade_detected
          }_agent`,
          reason: `Topic switch to ${topicSwitch}`,
          confidence: 0.8,
        };
      }

      // Check for confusion requiring conversation agent intervention
      if (
        /confused|don't understand|help me|what do you mean/.test(
          message.toLowerCase()
        ) &&
        currentAgentId !== "conversation_agent"
      ) {
        return {
          handoff_needed: true,
          target_agent: "conversation_agent",
          reason: "User expressing confusion",
          confidence: 0.7,
        };
      }

      return {
        handoff_needed: false,
        confidence: 0.6,
        current_agent: currentAgentId,
      };
    } catch (error) {
      console.error("Handoff determination error:", error);
      return {
        handoff_needed: false,
        error: true,
        message: "Error determining handoff",
      };
    }
  }

  /**
   * Detect topic switches from user messages
   * @param {string} message - User message
   * @returns {string|null} - Detected topic or null
   */
  detectTopicSwitch(message) {
    const lower = message.toLowerCase();

    if (/\bstat|statistics\b/.test(lower)) return "statistics";
    if (/\btrig|sine|cosine|tan\b/.test(lower)) return "trigonometry";
    if (/\bfunction|parabola|exponential|log\b/.test(lower)) return "functions";
    if (/\balgebra|factor|equation|inequal|quadratic\b/.test(lower))
      return "algebra";
    if (/\bgeometry|midpoint|gradient|distance|coordinate|circle\b/.test(lower))
      return "geometry";

    return null;
  }

  /**
   * Detect request type from user message
   * @param {string} message - User message
   * @returns {string} - Request type
   */
  detectRequestType(message) {
    const lower = message.toLowerCase();

    if (/practice|question|exercise/.test(lower)) return "practice_request";
    if (/homework|solve|help me with|answer|solution/.test(lower))
      return "homework_help";
    if (/exam|test|paper|revision/.test(lower)) return "exam_prep";
    if (/explain|concept|understand|what is|how does/.test(lower))
      return "concept_explanation";

    return "general_query";
  }

  /**
   * Generate unique state key
   * @param {string} agentId - Agent ID
   * @param {string} userId - User ID
   * @returns {string} - Unique key for state map
   */
  getStateKey(agentId, userId) {
    return `${agentId}:${userId}`;
  }

  /**
   * Clear agent state
   * @param {string} agentId - Agent ID
   * @param {string} userId - User ID
   */
  clearAgentState(agentId, userId) {
    const key = this.getStateKey(agentId, userId);
    this.agentStates.delete(key);
  }

  /**
   * Clean up old agent states and handoff records
   * Should be called periodically to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const TTL = 30 * 60 * 1000; // 30 minutes

    // Clean up agent states
    for (const [key, state] of this.agentStates.entries()) {
      const lastUpdated = new Date(state.last_updated).getTime();
      if (now - lastUpdated > TTL) {
        this.agentStates.delete(key);
      }
    }

    // Clean up handoff history
    for (const [key, handoff] of this.handoffHistory.entries()) {
      const handoffTime = new Date(handoff.timestamp).getTime();
      if (now - handoffTime > TTL) {
        this.handoffHistory.delete(key);
      }
    }
  }
}

// Create singleton instance
const agentStateManager = new AgentStateManager();

// Clean up every 15 minutes
setInterval(() => {
  agentStateManager.cleanup();
}, 15 * 60 * 1000);

module.exports = agentStateManager;
