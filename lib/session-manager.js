/**
 * Enhanced Session Manager
 * Provides persistent user state across interactions with error handling
 */
const { getSupabaseClient } = require("./config/database");

// In-memory cache for active sessions
const sessionCache = new Map();
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get a user session by ID with comprehensive error handling
 * @param {string} userId - User identifier
 * @returns {object} - User session
 */

function handleDatabaseError(error, operation, userId) {
  console.error(`Database ${operation} error for user ${userId}:`, error);

  // Log specific information for database schema issues
  if (error.code === "22P02" && error.message.includes("uuid")) {
    console.error(
      "DATABASE SCHEMA ERROR: user_id column is likely UUID type but should be TEXT"
    );
  } else if (error.code === "PGRST204") {
    console.error(
      "DATABASE SCHEMA ERROR: Missing expected columns in user_sessions table"
    );
  }

  // Always return null so the code can fall back to in-memory
  return null;
}

async function getSession(userId) {
  try {
    // Check cache first for performance
    const cached = getCachedSession(userId);
    if (cached) {
      console.log(`Session cache hit for user ${userId}`);
      return cached;
    }

    console.log(`Loading session for user ${userId}`);

    // Try to load from database
try {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    // Not found is ok
    return handleDatabaseError(error, "retrieval", userId);
  }

  if (data) {
    console.log(`Retrieved existing session for ${userId} from database`);

    // Convert stored JSON to session object
    const session = {
      ...data.session_data,
      created_at: data.created_at,
      last_updated: data.last_updated,
    };

    // Cache the session
    cacheSession(userId, session);
    return session;
  }
} catch (e) {
  console.warn("Database session retrieval error:", e);
  // Continue with creating a new session (fallback to in-memory)
}

    // Create new session
    console.log(`Creating new session for user ${userId}`);
    const newSession = createNewSession(userId);

    // Cache the new session
    cacheSession(userId, newSession);

    // Attempt to save to database (async)
    try {
      const supabase = getSupabaseClient();
      supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          created_at: newSession.created_at,
          last_updated: newSession.last_updated,
          session_data: newSession,
        })
        .then(({ error }) => {
          if (error) console.error("Session creation error:", error);
          else console.log(`New session for ${userId} saved to database`);
        });
    } catch (e) {
      console.warn("Database session creation error:", e);
      // Session will remain in memory cache only
    }

    return newSession;
  } catch (error) {
    console.error(`Critical session error for user ${userId}:`, error);

    // Return a minimal functional session as ultimate fallback
    return {
      user_id: userId,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      conversation_count: 0,
      welcome_sent: false,
      has_received_help: false,
      emergency_fallback: true,
      message_history: [],
    };
  }
}

/**
 * Create a new session object with default values
 * @param {string} userId - User identifier
 * @returns {object} - New session object
 */
function createNewSession(userId) {
  return {
    user_id: userId,
    created_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    conversation_count: 0,
    welcome_sent: false,
    has_received_help: false,
    message_history: [],
    // Agent state tracking
    current_agent: "conversation_agent",
    agent_history: [],
    // User context
    grade_detected: null,
    subject: null,
    topic: null,
    // Specialized contexts
    practice: {
      topic: null,
      difficulty: "easy",
      used_question_ids: [],
    },
    exam_flow: {
      active: false,
      subject: null,
      grade: null,
      focus_topic: null,
      mode: null,
    },
  };
}

/**
 * Update a user session with new data
 * @param {string} userId - User identifier
 * @param {object} update - Data to update
 * @returns {object} - Updated session
 */
async function updateSession(userId, update) {
  try {
    // Get current session
    const session = await getSession(userId);

    // Apply updates with deep merge for nested objects
    const updatedSession = deepMerge(session, update);
    updatedSession.last_updated = new Date().toISOString();

    // Update cache immediately
    cacheSession(userId, updatedSession);

    // Update database (async)
    try {
      const supabase = getSupabaseClient();
      supabase
        .from("user_sessions")
        .update({
          last_updated: updatedSession.last_updated,
          session_data: updatedSession,
        })
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) console.error("Session update error:", error);
        });
    } catch (e) {
      console.warn("Database session update error:", e);
      // Continue with cached version
    }

    return updatedSession;
  } catch (error) {
    console.error(`Session update error for user ${userId}:`, error);
    // Return original session or minimal session as fallback
    return await getSession(userId);
  }
}

/**
 * Add message to user history
 * @param {string} userId - User identifier
 * @param {object} message - Message to add to history
 * @returns {object} - Updated session
 */
async function addToHistory(userId, message) {
  try {
    const session = await getSession(userId);

    // Ensure history array exists
    if (!Array.isArray(session.message_history)) {
      session.message_history = [];
    }

    // Limit history size (keep most recent)
    if (session.message_history.length >= 20) {
      session.message_history = session.message_history.slice(-19);
    }

    // Add message to history
    session.message_history.push(message);

    // Update conversation count if user message
    if (message.role === "user") {
      session.conversation_count = (session.conversation_count || 0) + 1;
    }

    // Update cache
    cacheSession(userId, {
      ...session,
      last_updated: new Date().toISOString(),
    });

    // Update database (async)
    try {
      const supabase = getSupabaseClient();
      supabase
        .from("user_sessions")
        .update({
          last_updated: new Date().toISOString(),
          session_data: {
            ...session,
            last_updated: new Date().toISOString(),
          },
        })
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) console.error("History update error:", error);
        });
    } catch (e) {
      console.warn("Database history update error:", e);
      // Continue with cached version
    }

    return session;
  } catch (error) {
    console.error(`Message history update error for user ${userId}:`, error);
    return await getSession(userId);
  }
}

/**
 * Deep merge two objects
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} - Merged object
 */
function deepMerge(target, source) {
  if (!source) return target;

  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (isObject(source[key]) && isObject(target[key])) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
  }

  return output;
}

/**
 * Check if value is an object
 * @param {any} item - Item to check
 * @returns {boolean} - True if object
 */
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Get cached session
 * @param {string} userId - User identifier
 * @returns {object|null} - Cached session or null
 */
function getCachedSession(userId) {
  const cached = sessionCache.get(userId);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.cachedAt > SESSION_TTL_MS) {
    sessionCache.delete(userId);
    return null;
  }

  return cached.data;
}

/**
 * Cache a session
 * @param {string} userId - User identifier
 * @param {object} sessionData - Session data
 */
function cacheSession(userId, sessionData) {
  sessionCache.set(userId, {
    data: sessionData,
    cachedAt: Date.now(),
  });
}

// Clean cache periodically
setInterval(() => {
  console.log(`Cleaning session cache (${sessionCache.size} sessions)`);
  const now = Date.now();
  let expiredCount = 0;

  for (const [userId, session] of sessionCache.entries()) {
    if (now - session.cachedAt > SESSION_TTL_MS) {
      sessionCache.delete(userId);
      expiredCount++;
    }
  }

  console.log(
    `Session cache cleanup: removed ${expiredCount} expired sessions`
  );
}, SESSION_CLEANUP_INTERVAL_MS);

module.exports = {
  getSession,
  updateSession,
  addToHistory,
};
