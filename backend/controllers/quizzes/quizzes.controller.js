import axios from "axios";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/appiError.js";
import { Quiz } from "../../models/quiz.schema.js";
import { QuizResult } from "../../models/quizResult.schema.js";

const aiClient = axios.create({
  baseURL: process.env.FASTAPI_URL,
  timeout: Number(process.env.QUIZ_TIMEOUT_MS) || 30000,
});

// --- helpers -------------------------------------------------------------

// Strip the answer key before sending a quiz to the client to be taken.
// correctIndex/explanation are omitted so they can't be read from the network tab.
function toSafeQuiz(quiz) {
  return {
    _id: quiz._id,
    userId: quiz.userId,
    roadmapId: quiz.roadmapId,
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    estimatedTime: quiz.estimatedTime,
    totalQuestions: quiz.questions.length,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    })),
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}

// Full quiz WITH answers — only used after submission, for the results review.
function toFullQuiz(quiz) {
  return {
    _id: quiz._id,
    title: quiz.title,
    topic: quiz.topic,
    difficulty: quiz.difficulty,
    estimatedTime: quiz.estimatedTime,
    totalQuestions: quiz.questions.length,
    questions: quiz.questions.map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
    })),
  };
}

function gradeFor(percentage) {
  if (percentage >= 90) return "A";
  if (percentage >= 75) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function feedbackFor(grade) {
  switch (grade) {
    case "A":
      return "Outstanding — you have a strong grasp of this topic.";
    case "B":
      return "Great work. A little review and you'll have it fully locked in.";
    case "C":
      return "Solid effort. Revisit the questions you missed to close the gaps.";
    case "D":
      return "You're getting there — spend more time on this topic and retake the quiz.";
    default:
      return "This topic needs more study. Review the material and try again.";
  }
}

// --- controllers ---------------------------------------------------------

// POST /api/v1/quizzes/generate
export const generateQuiz = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { topic, difficulty = "mixed", numQuestions = 5, roadmapId, title, category } = req.body;

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    throw new ApiError(400, "A topic is required to generate a quiz");
  }

  // Clamp to bound LLM cost/abuse (loophole #8).
  const n = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 3), 15);
  const allowedDifficulty = ["easy", "medium", "hard", "mixed"];
  const diff = allowedDifficulty.includes(difficulty) ? difficulty : "mixed";

  let aiResponse;
  try {
    aiResponse = await aiClient.post("/ai/quiz", {
      topic: topic.trim(),
      difficulty: diff,
      num_questions: n,
    });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 422) throw new ApiError(400, "Invalid topic for quiz generation");
    // Upstream (AI service / provider) failure — don't leak internals.
    throw new ApiError(502, "Quiz generation service is unavailable. Please try again.");
  }

  const questions = (aiResponse.data?.questions || []).map((q) => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty || "medium",
  }));

  if (questions.length === 0) {
    throw new ApiError(502, "Quiz generation returned no valid questions. Please try again.");
  }

  const quiz = await Quiz.create({
    userId,
    roadmapId: roadmapId || undefined,
    title: (title && title.trim()) || `${topic.trim()} Quiz`,
    description: `Test your knowledge of ${topic.trim()}.`,
    category: (category && category.trim()) || topic.trim(),
    topic: topic.trim(),
    difficulty: diff,
    estimatedTime: Math.ceil(questions.length * 1.5),
    questions,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, toSafeQuiz(quiz), "Quiz generated successfully"));
});

// GET /api/v1/quizzes
export const getQuizzes = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const quizzes = await Quiz.find({ userId }).sort({ createdAt: -1 });
  const safe = quizzes.map(toSafeQuiz);
  return res
    .status(200)
    .json(new ApiResponse(200, safe, "Quizzes retrieved successfully"));
});

// GET /api/v1/quizzes/:quizId  (for taking — no answers)
export const getQuizById = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { quizId } = req.params;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new ApiError(404, "Quiz not found");
  if (quiz.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You don't have access to this quiz");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, toSafeQuiz(quiz), "Quiz retrieved successfully"));
});

// POST /api/v1/quizzes/:quizId/submit  { answers: number[], timeSpent }
export const submitQuiz = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { quizId } = req.params;
  const { answers, timeSpent = 0 } = req.body;

  if (!Array.isArray(answers)) {
    throw new ApiError(400, "answers must be an array of selected option indices");
  }

  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new ApiError(404, "Quiz not found");
  if (quiz.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You don't have access to this quiz");
  }

  // Score SERVER-SIDE against the stored answer key. Never trust a client score.
  const graded = quiz.questions.map((q, i) => {
    const selectedRaw = answers[i];
    const selectedIndex =
      Number.isInteger(selectedRaw) && selectedRaw >= 0 && selectedRaw <= 3
        ? selectedRaw
        : -1; // unanswered / invalid
    return {
      questionIndex: i,
      selectedIndex,
      isCorrect: selectedIndex === q.correctIndex,
    };
  });

  const total = quiz.questions.length;
  const score = graded.filter((g) => g.isCorrect).length;
  const percentage = total > 0 ? (score / total) * 100 : 0;
  const grade = gradeFor(percentage);

  const result = await QuizResult.create({
    userId,
    quizId: quiz._id,
    answers: graded,
    score,
    total,
    percentage,
    grade,
    timeSpent: Number(timeSpent) || 0,
    feedback: feedbackFor(grade),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { attemptId: result._id, score, total, percentage, grade }, "Quiz submitted"));
});

// GET /api/v1/quizzes/attempt/:attemptId  (result + full quiz for review)
export const getAttempt = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { attemptId } = req.params;

  const result = await QuizResult.findById(attemptId);
  if (!result) throw new ApiError(404, "Attempt not found");
  if (result.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You don't have access to this attempt");
  }

  const quiz = await Quiz.findById(result.quizId);
  if (!quiz) throw new ApiError(404, "Quiz for this attempt no longer exists");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: result._id,
        quizId: result.quizId,
        userId: result.userId,
        answers: result.answers,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        grade: result.grade,
        timeSpent: result.timeSpent,
        feedback: result.feedback,
        createdAt: result.createdAt,
        quiz: toFullQuiz(quiz),
      },
      "Attempt retrieved"
    )
  );
});

// GET /api/v1/quizzes/attempts  (history — used by dashboard later)
export const getUserAttempts = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { quizId } = req.query;
  const filter = { userId };
  if (quizId) filter.quizId = quizId;
  const attempts = await QuizResult.find(filter).sort({ createdAt: -1 });
  return res
    .status(200)
    .json(new ApiResponse(200, attempts, "Attempts retrieved"));
});
