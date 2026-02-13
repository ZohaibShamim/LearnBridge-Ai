"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getQuizById, Quiz } from "@/config/services/quiz.service";
import axios from "axios";

interface QuizResult {
  _id: string;
  quizId: string;
  userId: string;
  attempt: {
    answers: Array<{
      questionId: string;
      selectedAnswer: string;
      isCorrect: boolean;
    }>;
    score: number;
    timeSpent: number;
  };
  percentage: number;
  grade: string;
  feedback: string;
  createdAt: string;
}

function GradeIndicator({ grade, percentage }: { grade: string; percentage: number }) {
  const getGradeColor = (g: string) => {
    switch (g) {
      case "A":
        return { bg: "from-green-500 to-emerald-600", text: "text-white" };
      case "B":
        return { bg: "from-blue-500 to-indigo-600", text: "text-white" };
      case "C":
        return { bg: "from-yellow-500 to-orange-600", text: "text-white" };
      case "D":
        return { bg: "from-orange-500 to-red-600", text: "text-white" };
      default:
        return { bg: "from-red-500 to-red-600", text: "text-white" };
    }
  };

  const colors = getGradeColor(grade);

  return (
    <div className={`bg-gradient-to-br ${colors.bg} rounded-3xl p-12 text-center ${colors.text}`}>
      <div className="text-6xl font-bold mb-4">{grade}</div>
      <div className="text-2xl font-semibold mb-2">{percentage.toFixed(1)}%</div>
      <p className="text-white/80 text-lg">
        {grade === "A"
          ? "Outstanding! Excellent performance"
          : grade === "B"
          ? "Great job! Very good understanding"
          : grade === "C"
          ? "Good effort! Room for improvement"
          : grade === "D"
          ? "Keep practicing to improve"
          : "Try again to strengthen your knowledge"}
      </p>
    </div>
  );
}

interface AnswerReview {
  questionId: string;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export default function QuizResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const attemptId = searchParams.get("attemptId");

  // Fetch quiz details
  const { data: quizData, isLoading: isQuizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuizById(quizId),
    enabled: !!quizId,
  });

  // Fetch result details
  const { data: resultData, isLoading: isResultLoading } = useQuery({
    queryKey: ["quizResult", attemptId],
    queryFn: async () => {
      const response = await axios.get(`/api/v1/quizzes/attempt/${attemptId}`);
      return response.data;
    },
    enabled: !!attemptId,
  });

  const quiz = quizData?.data as Quiz;
  const result = resultData?.data as QuizResult;

  if (isQuizLoading || isResultLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!quiz || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">Results not found</p>
          <button
            onClick={() => router.push("/quizzes")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  const timeSpent = result.attempt.timeSpent;
  const totalQuestions = quiz.totalQuestions;
  const correctAnswers = result.attempt.answers.filter((a) => a.isCorrect).length;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Calculate difficulty distribution
  const difficultyStats = quiz.questions.reduce(
    (acc, q, idx) => {
      const answer = result.attempt.answers[idx];
      if (q.difficulty === "easy") {
        if (answer?.isCorrect) acc.easy.correct++;
        acc.easy.total++;
      } else if (q.difficulty === "medium") {
        if (answer?.isCorrect) acc.medium.correct++;
        acc.medium.total++;
      } else {
        if (answer?.isCorrect) acc.hard.correct++;
        acc.hard.total++;
      }
      return acc;
    },
    { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Quiz Results</h2>
          <button
            onClick={() => router.push("/quizzes")}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all"
          >
            Back to Quizzes
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-20 mb-12">
        {/* Main Result Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
          {/* Quiz Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
            <p className="text-slate-600">Quiz completed successfully</p>
          </div>

          {/* Grade Card */}
          <GradeIndicator grade={result.grade} percentage={result.percentage} />

          {/* Score Details */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-blue-900">Correct Answers</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{correctAnswers}</p>
              <p className="text-sm text-blue-700 mt-1">out of {totalQuestions} questions</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-purple-900">Time Spent</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">{formatTime(timeSpent)}</p>
              <p className="text-sm text-purple-700 mt-1">estimated time: {quiz.estimatedTime}m</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
              <div className="flex items-center gap-3 mb-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-semibold text-orange-900">Accuracy</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">{result.percentage.toFixed(1)}%</p>
              <p className="text-sm text-orange-700 mt-1">performance score</p>
            </div>
          </div>
        </div>

        {/* Performance by Difficulty */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance by Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Easy */}
            <div className="rounded-2xl p-6 bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2">
                <span className="text-lg">⭐</span> Easy
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-green-700 font-medium mb-1">Correct: {difficultyStats.easy.correct}/{difficultyStats.easy.total}</p>
                  <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600"
                      style={{
                        width: `${difficultyStats.easy.total > 0 ? (difficultyStats.easy.correct / difficultyStats.easy.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {difficultyStats.easy.total > 0
                    ? ((difficultyStats.easy.correct / difficultyStats.easy.total) * 100).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Medium */}
            <div className="rounded-2xl p-6 bg-yellow-50 border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                <span className="text-lg">⭐⭐</span> Medium
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-yellow-700 font-medium mb-1">Correct: {difficultyStats.medium.correct}/{difficultyStats.medium.total}</p>
                  <div className="w-full h-2 bg-yellow-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-600"
                      style={{
                        width: `${difficultyStats.medium.total > 0 ? (difficultyStats.medium.correct / difficultyStats.medium.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-600">
                  {difficultyStats.medium.total > 0
                    ? ((difficultyStats.medium.correct / difficultyStats.medium.total) * 100).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Hard */}
            <div className="rounded-2xl p-6 bg-red-50 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
                <span className="text-lg">⭐⭐⭐</span> Hard
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-red-700 font-medium mb-1">Correct: {difficultyStats.hard.correct}/{difficultyStats.hard.total}</p>
                  <div className="w-full h-2 bg-red-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600"
                      style={{
                        width: `${difficultyStats.hard.total > 0 ? (difficultyStats.hard.correct / difficultyStats.hard.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {difficultyStats.hard.total > 0
                    ? ((difficultyStats.hard.correct / difficultyStats.hard.total) * 100).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {result.feedback && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Feedback</h2>
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 text-blue-900">
              <p className="leading-relaxed">{result.feedback}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => router.push("/quizzes")}
            className="px-6 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-2xl font-semibold hover:bg-blue-50 transition-all"
          >
            Back to Quizzes
          </button>
          <button
            onClick={() => router.push(`/quizzes/${quizId}`)}
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
          >
            Retake Quiz
          </button>
        </div>

        {/* Answer Review Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Answer Review</h2>
          <div className="space-y-4">
            {quiz.questions.map((question, idx) => {
              const answer = result.attempt.answers[idx];
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-6 border-l-4 ${
                    answer?.isCorrect
                      ? "bg-green-50 border-l-green-600"
                      : "bg-red-50 border-l-red-600"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-1">
                        Question {idx + 1}
                      </p>
                      <h4 className="font-semibold text-slate-900">
                        {question.question}
                      </h4>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-4 ${
                        answer?.isCorrect
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {answer?.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-slate-600 font-medium">Your answer:</p>
                      <p className="text-slate-900 font-semibold">
                        {answer?.selectedAnswer || "Not answered"}
                      </p>
                    </div>
                    {!answer?.isCorrect && (
                      <div>
                        <p className="text-slate-600 font-medium">Correct answer:</p>
                        <p className="text-green-700 font-semibold">
                          {question.correctAnswer}
                        </p>
                      </div>
                    )}
                    {question.explanation && (
                      <div>
                        <p className="text-slate-600 font-medium">Explanation:</p>
                        <p className="text-slate-700 italic">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
