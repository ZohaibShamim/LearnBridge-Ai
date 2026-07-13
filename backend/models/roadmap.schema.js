import mongoose from "mongoose";

// Subtopics KEEP their _id — it is the stable key that links a subtopic to its
// generated quizzes and to clearedSubtopics/badges progress records.
const subtopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String },
  // Scraped per-subtopic learning resources ({ youtube_video, article }), like steps.
  resources: { type: Object },
});

const stepSchema = new mongoose.Schema(
  {
    month: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    skills: [
      {
        type: String,
      },
    ],
    resources: {
      type: Object,
    },
    subtopics: [subtopicSchema],
  },
  { _id: false }
);

const roadmapSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  jobTitle: {
    type: String,
    required: true,
  },

  roadmap: {
    career_goal: {
      type: String,
    },
    steps: [stepSchema],
  },

  description: {
    type: String,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // 0-based indices of steps the user has marked complete. Progress % is derived from
  // completedSteps.length / roadmap.steps.length (see progress controller / dashboard).
  completedSteps: [
    {
      type: Number,
    },
  ],

  // Quiz-driven progress: a subtopic is "cleared" when its medium or hard quiz is passed.
  clearedSubtopics: [
    {
      stepIndex: { type: Number, required: true },
      subtopicId: { type: String, required: true },
      difficulty: { type: String, enum: ["medium", "hard"], required: true },
    },
  ],

  // One badge per topic, awarded the first time a HARD subtopic quiz in that topic is passed.
  badges: [
    {
      stepIndex: { type: Number, required: true },
      title: { type: String, required: true },
      earnedAt: { type: Date, default: Date.now },
    },
  ],

  tags: [
    {
      type: String,
    },
  ],

  skills: [
    {
      type: String,
    },
  ],

  // Skill analysis carried over from the job (R1.6 extraction, R1.7 gap).
  extractedSkills: [{ type: String }],
  missingSkills: [{ type: String }],

}, { timestamps: true });

export const Roadmap = mongoose.model("Roadmap", roadmapSchema);
