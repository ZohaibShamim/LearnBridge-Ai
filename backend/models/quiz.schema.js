import mongoose from "mongoose";

// A single question. correctIndex + explanation are the server-side source of truth and
// must NEVER be sent to the client while a quiz is being taken (only after submission).
const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 4,
        message: "Each question must have exactly 4 options",
      },
    },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Optional link back to the roadmap the topic came from.
    roadmapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Roadmap",
    },
    // Set only for roadmap subtopic quizzes. Together with roadmapId+difficulty these form the
    // lazy-generation cache key so a given (user, roadmap, step, subtopic, difficulty) reuses one quiz.
    stepIndex: { type: Number },
    subtopicId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    topic: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard", "mixed"],
      default: "mixed",
    },
    estimatedTime: { type: Number, default: 5 }, // minutes
    questions: {
      type: [questionSchema],
      required: true,
    },
  },
  { timestamps: true }
);

export const Quiz = mongoose.model("Quiz", quizSchema);
