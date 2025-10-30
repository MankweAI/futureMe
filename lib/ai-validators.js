// lib/ai-validators.js
// Very lightweight validation + sanitization for AI generated educational content

function noAnswerLeak(text) {
  // Disallow obvious "Answer:" or final numeric answer patterns in concept explanations / scaffolds
  if (!text) return true;
  const leakPatterns = [
    /\banswer\b\s*:/i,
    /\bfinal answer\b/i,
    /=\s*\d+(\.\d+)?\s*$/m, // ends with = number
  ];
  return !leakPatterns.some((r) => r.test(text));
}

function clampWords(text, max = 180) {
  if (!text) return "";
  const words = text.split(/\s+/);
  if (words.length <= max) return text;
  return words.slice(0, max).join(" ") + " …";
}

function validateConceptJSON(json) {
  if (!json.main_explanation) throw new Error("Missing main_explanation");
  if (!noAnswerLeak(json.main_explanation))
    throw new Error("Answer leakage in concept explanation");
  return true;
}

function validateHomeworkJSON(json) {
  if (!json.analysis || !json.steps || !Array.isArray(json.steps))
    throw new Error("Invalid homework JSON");
  return true;
}

function validateExamPrepJSON(json) {
  if (!json.questions || json.questions.length < 3)
    throw new Error("Exam pack must have >=3 questions");
  return true;
}

module.exports = {
  noAnswerLeak,
  clampWords,
  validateConceptJSON,
  validateHomeworkJSON,
  validateExamPrepJSON,
};
