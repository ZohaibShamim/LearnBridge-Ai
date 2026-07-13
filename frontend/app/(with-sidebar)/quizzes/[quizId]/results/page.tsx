"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Zap, AlertTriangle } from "lucide-react";
import { getAttempt } from "@/config/services/quiz.service";
import { Button, Card, Badge, Progress, StatTile, Spinner, EmptyState } from "@/components/ui";

// Per-difficulty literal color map (never interpolated). Progress uses tone="success"
// as the gradient base, then overrides the from-/to- stops via barClassName.
const DIFF_ROWS = [
  {
    key: "easy",
    label: "Easy",
    stars: "⭐",
    card: "bg-green-50 border-green-200",
    head: "text-green-900",
    text: "text-green-700",
    num: "text-green-600",
    track: "bg-green-100",
    stops: "",
  },
  {
    key: "medium",
    label: "Medium",
    stars: "⭐⭐",
    card: "bg-yellow-50 border-yellow-200",
    head: "text-yellow-900",
    text: "text-yellow-700",
    num: "text-yellow-600",
    track: "bg-yellow-100",
    stops: "from-yellow-400 to-yellow-500",
  },
  {
    key: "hard",
    label: "Hard",
    stars: "⭐⭐⭐",
    card: "bg-red-50 border-red-200",
    head: "text-red-900",
    text: "text-red-700",
    num: "text-red-600",
    track: "bg-red-100",
    stops: "from-red-500 to-red-600",
  },
] as const;

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
    <div className={`rounded-3xl bg-gradient-to-br ${bg} p-12 text-center text-white`}>
      <div className="mb-4 text-6xl font-bold">{grade}</div>
      <div className="mb-2 text-2xl font-semibold">{percentage.toFixed(1)}%</div>
      <p className="text-lg text-white/80">{message}</p>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Spinner page label="Loading results..." />
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<AlertTriangle className="h-7 w-7" />}
            title="Results not found"
            description="We couldn't load these results. The attempt may have expired."
            action={
              <Button variant="primary" onClick={() => router.push("/quizzes")}>
                Back to Quizzes
              </Button>
            }
          />
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
      <div className="fixed left-0 right-0 top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h2 className="font-semibold text-slate-900">Quiz Results</h2>
          <Button variant="ghost" size="sm" onClick={() => router.push("/quizzes")}>
            Back to Quizzes
          </Button>
        </div>
      </div>

      <div className="mx-auto mb-12 mt-20 max-w-4xl">
        {/* Main result card */}
        <Card className="mb-8 p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold text-slate-900">{quiz.title}</h1>
            <p className="text-slate-600">Quiz completed successfully</p>
          </div>

          <GradeIndicator grade={result.grade} percentage={result.percentage} />

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatTile
              chip="blue"
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Correct Answers"
              value={correctAnswers}
              hint={`out of ${totalQuestions} questions`}
            />
            <StatTile
              chip="purple"
              icon={<Clock className="h-5 w-5" />}
              label="Time Spent"
              value={formatTime(timeSpent)}
              hint={`estimated: ${quiz.estimatedTime}m`}
            />
            <StatTile
              chip="orange"
              icon={<Zap className="h-5 w-5" />}
              label="Accuracy"
              value={`${result.percentage.toFixed(1)}%`}
              hint="performance score"
            />
          </div>
        </Card>

        {/* Performance by difficulty */}
        <Card className="mb-8 p-6 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Performance by Difficulty</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {DIFF_ROWS.map((r) => {
              const s = difficultyStats[r.key];
              const p = pct(s.correct, s.total);
              return (
                <div key={r.key} className={`rounded-2xl border p-6 ${r.card}`}>
                  <h3 className={`mb-4 flex items-center gap-2 font-semibold ${r.head}`}>
                    <span className="text-lg">{r.stars}</span> {r.label}
                  </h3>
                  <p className={`mb-1 text-sm font-medium ${r.text}`}>
                    Correct: {s.correct}/{s.total}
                  </p>
                  <Progress value={p} tone="success" className={`mb-3 ${r.track}`} barClassName={r.stops} />
                  <p className={`text-2xl font-bold ${r.num}`}>{p.toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Feedback */}
        {result.feedback && (
          <Card className="mb-8 p-6 sm:p-8">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Feedback</h2>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-blue-900">
              <p className="leading-relaxed">{result.feedback}</p>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Button variant="secondary" size="lg" onClick={() => router.push("/quizzes")}>
            Back to Quizzes
          </Button>
          <Button variant="primary" size="lg" onClick={() => router.push(`/quizzes/${quizId}`)}>
            Retake Quiz
          </Button>
        </div>

        {/* Answer review */}
        <Card className="p-6 sm:p-8">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">Answer Review</h2>
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
                  className={`rounded-2xl border-l-4 p-6 ${isCorrect ? "border-l-green-600 bg-green-50" : "border-l-red-600 bg-red-50"}`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-1 text-sm font-medium text-slate-600">Question {idx + 1}</p>
                      <h4 className="font-semibold text-slate-900">{question.question}</h4>
                    </div>
                    <Badge tone={isCorrect ? "success" : "danger"} className="whitespace-nowrap">
                      {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-600">Your answer:</p>
                      <p className="font-semibold text-slate-900">{userAnswer}</p>
                    </div>
                    {!isCorrect && (
                      <div>
                        <p className="font-medium text-slate-600">Correct answer:</p>
                        <p className="font-semibold text-green-700">{correctAnswer}</p>
                      </div>
                    )}
                    {question.explanation && (
                      <div>
                        <p className="font-medium text-slate-600">Explanation:</p>
                        <p className="italic text-slate-700">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
