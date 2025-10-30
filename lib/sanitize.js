function sanitizeName(name) {
  if (!name) return "";
  const n = ("" + name).trim();
  if (!n) return "";
  const lower = n.toLowerCase();
  const banned = ["sir", "student", "user", "friend", "buddy", "learner"];
  if (banned.includes(lower)) return "";
  return n.split(/\s+/)[0];
}
module.exports = { sanitizeName };
