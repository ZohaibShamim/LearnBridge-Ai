"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAttempt } from "@/config/services/quiz.service";

function GradeIndicator({ grade, percentage }: { grade: string; percentage: number }) {
  // Literal-class map per grade (DESIGN.md grade mapping: A green, B blue, C yellow, D orange, F red).
  const gradeColors: Record<string, string> = {
    A: "from-green-500 to-emerald-600",
    B: "from-blue-500 to-indigo-600",
    C: "from-yellow-500 to-orange-600",
    D: "from-orange-500 to-red-600",
    F: "from-red-500 to-red-600",
  };
  const bg = gradeColors[grade] || gradeColors.F;

  const message =
    grade === "A" ? "Outstanding! Excellent performance"
    : grade === "B" ? "Great job! Very good understanding"
    : grade === "C" ? "Good effort! Room for improvement"
    : grade === "D" ? "Keep practicing to improve"
    : "Try again to strengthen your knowledge";

  return (
    <div className={`bg-gradient-to-br ${bg} rounded-3xl p-12 text-center text-white`}>
      <div className="text-6xl font-bold mb-4">{grade}</div>
      <div className="text-2xl font-semibold mb-2">{percentage.toFixed(1)}%</div>
      <p className="text-white/80 text-lg">{message}</p>
    </div>
  );
}

export default function QuizResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const quizId = params.quizId as string;
  const attemptId = searchParams.get("attemptId");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quizAttempt", attemptId],
    queryFn: () => getAttempt(attemptId as string),
    enabled: !!attemptId,
  });

  const result = data?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading results...</p>
        </div>
      </div>
    );
  }

  if (isError || !result) {
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

  const quiz = result.quiz;
  const timeSpent = result.timeSpent;
  const totalQuestions = result.total;
  const correctAnswers = result.score;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Difficulty breakdown from the quiz questions + which were correct.
  const difficultyStats = quiz.questions.reduce(
    (acc, q, idx) => {
      const answer = result.answers[idx];
      const bucket = q.difficulty === "easy" ? acc.easy : q.difficulty === "hard" ? acc.hard : acc.medium;
      if (answer?.isCorrect) bucket.correct++;
      bucket.total++;
      return acc;
    },
    { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } }
  );

  const pct = (c: number, t: number) => (t > 0 ? (c / t) * 100 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
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
        {/* Main result card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{quiz.title}</h1>
            <p className="text-slate-600">Quiz completed successfully</p>
          </div>

          <GradeIndicator grade={result.grade} percentage={result.percentage} />

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
              <p className="text-sm text-purple-700 mt-1">estimated: {quiz.estimatedTime}m</p>
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

        {/* Performance by difficulty */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Performance by Difficulty</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl p-6 bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-900 mb-4 flex items-center gap-2"><span className="text-lg">⭐</span> Easy</h3>
              <p className="text-sm text-green-700 font-medium mb-1">Correct: {difficultyStats.easy.correct}/{difficultyStats.easy.total}</p>
              <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-green-600" style={{ width: `${pct(difficultyStats.easy.correct, difficultyStats.easy.total)}%` }} />
              </div>
              <p className="text-2xl font-bold text-green-600">{pct(difficultyStats.easy.correct, difficultyStats.easy.total).toFixed(0)}%</p>
            </div>

            <div className="rounded-2xl p-6 bg-yellow-50 border border-yellow-200">
              <h3 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2"><span className="text-lg">⭐⭐</span> Medium</h3>
              <p className="text-sm text-yellow-700 font-medium mb-1">Correct: {difficultyStats.medium.correct}/{difficultyStats.medium.total}</p>
              <div className="w-full h-2 bg-yellow-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-yellow-600" style={{ width: `${pct(difficultyStats.medium.correct, difficultyStats.medium.total)}%` }} />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{pct(difficultyStats.medium.correct, difficultyStats.medium.total).toFixed(0)}%</p>
            </div>

            <div className="rounded-2xl p-6 bg-red-50 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2"><span className="text-lg">⭐⭐⭐</span> Hard</h3>
              <p className="text-sm text-red-700 font-medium mb-1">Correct: {difficultyStats.hard.correct}/{difficultyStats.hard.total}</p>
              <div className="w-full h-2 bg-red-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-red-600" style={{ width: `${pct(difficultyStats.hard.correct, difficultyStats.hard.total)}%` }} />
              </div>
              <p className="text-2xl font-bold text-red-600">{pct(difficultyStats.hard.correct, difficultyStats.hard.total).toFixed(0)}%</p>
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

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => router.push("/quizzes")}
            className="px-6 py-4 bg-slate-100 text-slate-700 rounded-2xl font-semibold hover:bg-slate-200 transition-all"
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

        {/* Answer review */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Answer Review</h2>
          <div className="space-y-4">
            {quiz.questions.map((question, idx) => {
              const answer = result.answers[idx];
              const isCorrect = !!answer?.isCorrect;
              const selectedIndex = answer?.selectedIndex ?? -1;
              const userAnswer = selectedIndex >= 0 ? question.options[selectedIndex] : "Not answered";
              const correctAnswer = question.options[question.correctIndex];
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-6 border-l-4 ${isCorrect ? "bg-green-50 border-l-green-600" : "bg-red-50 border-l-red-600"}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-slate-600 font-medium mb-1">Question {idx + 1}</p>
                      <h4 className="font-semibold text-slate-900">{question.question}</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ml-4 ${isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-slate-600 font-medium">Your answer:</p>
                      <p className="text-slate-900 font-semibold">{userAnswer}</p>
                    </div>
                    {!isCorrect && (
                      <div>
                        <p className="text-slate-600 font-medium">Correct answer:</p>
                        <p className="text-green-700 font-semibold">{correctAnswer}</p>
                      </div>
                    )}
                    {question.explanation && (
                      <div>
                        <p className="text-slate-600 font-medium">Explanation:</p>
                        <p className="text-slate-700 italic">{question.explanation}</p>
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
