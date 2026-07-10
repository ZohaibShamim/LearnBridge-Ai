import mongoose from "mongoose";

// selectedIndex is -1 when the user left a question unanswered.
const answerSchema = new mongoose.Schema(
  {
    questionIndex: { type: Number, required: true },
    selectedIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

const quizResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
    },
    answers: { type: [answerSchema], required: true },
    score: { type: Number, required: true }, // number correct
    total: { type: Number, required: true }, // total questions
    percentage: { type: Number, required: true },
    grade: { type: String, required: true }, // A | B | C | D | F
    timeSpent: { type: Number, default: 0 }, // seconds, client-reported (not trusted)
    feedback: { type: String },
  },
  { timestamps: true }
);

export const QuizResult = mongoose.model("QuizResult", quizResultSchema);
