/**
 * Subject Agent Factory
 * Dynamically creates specialized subject agents based on subject and grade
 */
const { getOpenAIClient } = require("../config/openai");
const { BaseAgent } = require("./agent-protocol");
const { CAPS_SUBJECTS } = require("../caps-knowledge");

class SubjectAgent extends BaseAgent {
  constructor(subject, grade) {
    super(`${subject.toLowerCase()}_grade_${grade}_agent`);
    this.subject = subject;
    this.grade = grade;
    this.capabilities = [
      "subject_expertise",
      "topic_breakdown",
      "question_generation",
      "solution_steps",
      "conceptual_understanding",
    ];

    // Load subject-specific curriculum data
    this.curriculum = this.loadCurriculum();
    this.openai = getOpenAIClient();
  }

  loadCurriculum() {
    // Get subject topics from CAPS curriculum
    const normalizedSubject = this.normalizeSubjectName(this.subject);
    const subjectData =
      CAPS_SUBJECTS.core[normalizedSubject] ||
      CAPS_SUBJECTS.optional[normalizedSubject];

    return {
      topics: subjectData?.topics[this.grade] || [],
      assessment: subjectData?.assessment || "Standard assessment",
    };
  }

  normalizeSubjectName(name) {
    // Map common names to canonical names
    const map = {
      math: "Mathematics",
      maths: "Mathematics",
      physics: "Physical Sciences",
      science: "Physical Sciences",
      biology: "Life Sciences",
    };
    return map[name.toLowerCase()] || name;
  }

  async processMessage(userId, context) {
    const { message, intent } = context;

    // Generate a response using specialized knowledge
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content: `You are a specialized AI tutor for Grade ${this.grade} ${
            this.subject
          } in the South African CAPS curriculum.
          
Your expertise covers these topics:
${this.curriculum.topics.join(", ")}

Respond to the student in a helpful, educational manner. Focus on your specific subject expertise.
Be concise, accurate, and pedagogically sound. Format responses for WhatsApp (brief paragraphs, clear structure).`,
        },
        { role: "user", content: message },
      ],
    });

    return {
      agent_id: this.agentId,
      response: completion.choices[0].message.content,
      subject: this.subject,
      grade: this.grade,
    };
  }

  async generatePracticeQuestion(difficulty, topic) {
    // Method to generate subject-specific practice questions
    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `Generate a Grade ${this.grade} ${this.subject} CAPS curriculum aligned ${difficulty} difficulty question on ${topic}.
          The question should be clear, concise, and appropriate for WhatsApp format.
          Do not include the answer or solution.`,
        },
        {
          role: "user",
          content: `Create a ${difficulty} ${topic} question now.`,
        },
      ],
    });

    return completion.choices[0].message.content;
  }
}

class SubjectAgentFactory {
  constructor() {
    this.agents = new Map();
  }

  getAgent(subject, grade) {
    const key = `${subject.toLowerCase()}_${grade}`;

    if (!this.agents.has(key)) {
      this.agents.set(key, new SubjectAgent(subject, grade));
    }

    return this.agents.get(key);
  }
}

module.exports = new SubjectAgentFactory();

