// lib/session-state.js
// Enhanced in-memory session state for free-form AI Manager UX.
// NOTE: Stateless across cold starts (serverless). Persist later via Supabase if needed.

const sessions = new Map();
const MAX_IDLE_MS = 20 * 60 * 1000; // 20 minutes

function getSession(id) {
  prune();
  if (!sessions.has(id)) {
    sessions.set(id, {
      created_at: Date.now(),
      updated_at: Date.now(),
      user_turns: 0, // Count of distinct user messages (excluding duplicates)
      welcome_sent: false,
      assistance_dispatched: false, // Has ANY real help (pack / solution / explanation) been given
      last_help_type: null, // concept_pack | practice_pack | homework_scaffold | solution | exam_pack
      intent: null,
      intent_confidence: null,
      topic: null,
      subtopic: null,
      stage: null,
      pending_expectation: null, // e.g. "awaiting_dataset" / "awaiting_equation"
      last_hash: null,
      history: [], // {role:'user'|'assistant', content, t}
    });
  }
  return sessions.get(id);
}

function updateSession(id, patch) {
  const s = getSession(id);
  Object.assign(s, patch);
  s.updated_at = Date.now();
  return s;
}

function hashMessage(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h.toString();
}

function isDuplicate(id, message) {
  const s = getSession(id);
  const h = hashMessage(message.trim().toLowerCase());
  if (s.last_hash === h) return true;
  s.last_hash = h;
  return false;
}

function addHistory(id, role, content) {
  const s = getSession(id);
  s.history.push({ role, content, t: Date.now() });
  if (s.history.length > 16) s.history.splice(0, s.history.length - 16);
}

function prune() {
  const now = Date.now();
  for (const [k, v] of sessions.entries()) {
    if (now - v.updated_at > MAX_IDLE_MS) sessions.delete(k);
  }
}

module.exports = {
  getSession,
  updateSession,
  isDuplicate,
  addHistory,
};
