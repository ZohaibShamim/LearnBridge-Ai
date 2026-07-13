import axios from "axios";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/appiError.js";
import { Quiz } from "../../models/quiz.schema.js";
import { QuizResult } from "../../models/quizResult.schema.js";
import { Roadmap } from "../../models/roadmap.schema.js";
import { isTopicUnlocked, PASS_THRESHOLD, progressPercent } from "../../utils/learning.js";

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

// POST /api/v1/quizzes/subtopic  { roadmapId, stepIndex, subtopicId, difficulty }
// Lazily generate (or return the cached) quiz for one roadmap subtopic at a fixed difficulty.
export const getOrCreateSubtopicQuiz = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const { roadmapId, stepIndex, subtopicId, difficulty } = req.body;

  const idx = Number(stepIndex);
  if (!roadmapId || !Number.isInteger(idx) || idx < 0 || !subtopicId) {
    throw new ApiError(400, "roadmapId, stepIndex and subtopicId are required");
  }
  if (!["easy", "medium", "hard"].includes(difficulty)) {
    throw new ApiError(400, "difficulty must be easy, medium or hard");
  }

  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) throw new ApiError(404, "Roadmap not found");
  if (roadmap.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You don't have access to this roadmap");
  }

  const step = roadmap.roadmap?.steps?.[idx];
  const subtopic = step?.subtopics?.id(subtopicId);
  if (!step || !subtopic) throw new ApiError(404, "Subtopic not found on this roadmap");

  // Gate: the topic must be unlocked (all subtopics of the previous topic cleared).
  if (!isTopicUnlocked(roadmap, idx)) {
    throw new ApiError(403, "Complete the previous topic before starting this one");
  }

  // Cache: reuse an existing quiz for this exact (user, roadmap, step, subtopic, difficulty).
  const existing = await Quiz.findOne({
    userId, roadmapId, stepIndex: idx, subtopicId: String(subtopicId), difficulty,
  });
  if (existing) {
    return res.status(200).json(new ApiResponse(200, toSafeQuiz(existing), "Quiz ready"));
  }

  const topicLabel = `${step.title} — ${subtopic.title}`;
  let aiResponse;
  try {
    aiResponse = await aiClient.post("/ai/quiz", {
      topic: `${topicLabel}: ${subtopic.summary || subtopic.title}`,
      difficulty,
      num_questions: 5,
    });
  } catch (err) {
    if (err?.response?.status === 422) throw new ApiError(400, "Invalid subtopic for quiz generation");
    throw new ApiError(502, "Quiz generation service is unavailable. Please try again.");
  }

  const questions = (aiResponse.data?.questions || []).map((q) => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correct_index,
    explanation: q.explanation,
    difficulty: q.difficulty || difficulty,
  }));
  if (questions.length === 0) {
    throw new ApiError(502, "Quiz generation returned no valid questions. Please try again.");
  }

  const quiz = await Quiz.create({
    userId,
    roadmapId,
    stepIndex: idx,
    subtopicId: String(subtopicId),
    title: `${topicLabel} (${difficulty})`,
    description: `Test your knowledge of ${subtopic.title}.`,
    category: step.title,
    topic: topicLabel,
    difficulty,
    estimatedTime: Math.ceil(questions.length * 1.5),
    questions,
  });

  return res.status(201).json(new ApiResponse(201, toSafeQuiz(quiz), "Quiz generated"));
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
  const passed = percentage >= PASS_THRESHOLD;

  // Roadmap effects only for subtopic quizzes that were passed at medium/hard.
  let badgeAwarded = false;
  let progress = null;
  if (passed && quiz.roadmapId && quiz.subtopicId != null && ["medium", "hard"].includes(quiz.difficulty)) {
    const roadmap = await Roadmap.findById(quiz.roadmapId);
    if (roadmap && roadmap.userId.toString() === userId.toString()) {
      const sIdx = quiz.stepIndex;

      // Clear the subtopic (idempotent; upgrade difficulty to hard if it was medium before).
      const existingClear = roadmap.clearedSubtopics.find(
        (c) => c.stepIndex === sIdx && c.subtopicId === quiz.subtopicId
      );
      if (existingClear) {
        if (quiz.difficulty === "hard") existingClear.difficulty = "hard";
      } else {
        roadmap.clearedSubtopics.push({ stepIndex: sIdx, subtopicId: quiz.subtopicId, difficulty: quiz.difficulty });
      }

      // Badge: first hard pass anywhere in this topic.
      if (quiz.difficulty === "hard" && !roadmap.badges.some((b) => b.stepIndex === sIdx)) {
        const stepTitle = roadmap.roadmap?.steps?.[sIdx]?.title || `Topic ${sIdx + 1}`;
        roadmap.badges.push({ stepIndex: sIdx, title: stepTitle });
        badgeAwarded = true;
      }

      await roadmap.save();
      progress = progressPercent(roadmap);
    }
  }

  const result = await QuizResult.create({
    userId,
    quizId: quiz._id,
    answers: graded,
    score,
    total,
    percentage,
    grade,
    passed,
    difficulty: quiz.difficulty,
    roadmapId: quiz.roadmapId,
    stepIndex: quiz.stepIndex,
    subtopicId: quiz.subtopicId,
    badgeAwarded,
    timeSpent: Number(timeSpent) || 0,
    feedback: feedbackFor(grade),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, { attemptId: result._id, score, total, percentage, grade, passed, badgeAwarded, progress }, "Quiz submitted"));
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
        passed: result.passed,
        badgeAwarded: result.badgeAwarded,
        difficulty: result.difficulty,
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
