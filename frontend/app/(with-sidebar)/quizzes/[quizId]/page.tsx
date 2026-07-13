"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  HelpCircle,
  Gauge,
  Award,
  Info,
  Check,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getQuizById, submitQuiz } from "@/config/services/quiz.service";
import {
  Button,
  Card,
  Badge,
  difficultyTone,
  Progress,
  StatTile,
  Spinner,
  EmptyState,
} from "@/components/ui";

export default function QuizTakerPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.quizId as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quiz", quizId],
    queryFn: () => getQuizById(quizId),
    enabled: !!quizId,
  });

  const quiz = data?.data;
  const questions = quiz?.questions || [];

  const [questionIndex, setQuestionIndex] = useState(0);
  // questionIndex -> selected option index
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const currentQuestion = questions[questionIndex];

  const submitMutation = useMutation({
    mutationFn: () => {
      const answersArray = questions.map((_, i) => (i in answers ? answers[i] : -1));
      return submitQuiz(quizId, answersArray, timeSpent);
    },
    onSuccess: (res) => {
      router.push(`/quizzes/${quizId}/results?attemptId=${res.data.attemptId}`);
    },
    onError: (err: any) => {
      setSubmitError(err?.response?.data?.message || "Failed to submit quiz. Please try again.");
    },
  });

  // Timer
  useEffect(() => {
    if (!quizStarted) return;
    const timer = setInterval(() => setTimeSpent((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [quizStarted]);

  const handleAnswerSelect = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleNext = () => {
    if (questionIndex < questions.length - 1) setQuestionIndex((i) => i + 1);
  };
  const handlePrevious = () => {
    if (questionIndex > 0) setQuestionIndex((i) => i - 1);
  };

  const answeredCount = Object.keys(answers).length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;
  const canGoNext = questionIndex < questions.length - 1;
  const canGoPrevious = questionIndex > 0;
  const selectedForCurrent = questionIndex in answers ? answers[questionIndex] : null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- loading / error ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Spinner page label="Loading quiz..." />
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <div className="w-full max-w-md">
          <EmptyState
            icon={<AlertTriangle className="h-7 w-7" />}
            title="Quiz not found"
            description="We couldn't load this quiz. It may have been removed."
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

  // --- start screen ---
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Button variant="ghost" className="mb-8" onClick={() => router.push("/quizzes")}>
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>

        <div className="mx-auto max-w-2xl">
          <Card className="overflow-hidden shadow-[var(--shadow-lg)]">
            <div className="relative flex h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-8">
              <div className="absolute inset-0 opacity-10">
                <svg className="h-full w-full" viewBox="0 0 400 400" fill="none">
                  <circle cx="100" cy="100" r="80" fill="white" />
                  <circle cx="350" cy="350" r="100" fill="white" />
                </svg>
              </div>
              <h1 className="relative z-10 mb-2 text-4xl font-bold text-white">{quiz.title}</h1>
              <p className="relative z-10 text-blue-100">{quiz.category || quiz.topic}</p>
            </div>

            <div className="p-8">
              <p className="mb-8 text-lg text-slate-700">
                {quiz.description || `Test your knowledge of ${quiz.topic}.`}
              </p>

              <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatTile
                  chip="blue"
                  icon={<HelpCircle className="h-5 w-5" />}
                  label="Questions"
                  value={quiz.totalQuestions}
                />
                <StatTile
                  chip="green"
                  icon={<Clock className="h-5 w-5" />}
                  label="Est. Time"
                  value={`${quiz.estimatedTime}m`}
                />
                <StatTile
                  chip="purple"
                  icon={<Gauge className="h-5 w-5" />}
                  label="Difficulty"
                  value={<span className="capitalize">{quiz.difficulty}</span>}
                />
                <StatTile
                  chip="orange"
                  icon={<Award className="h-5 w-5" />}
                  label="Type"
                  value="Graded"
                />
              </div>

              <Card className="mb-8 bg-slate-50 p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                  <Info className="h-5 w-5 text-blue-600" />
                  Instructions
                </h3>
                <ul className="space-y-2 text-slate-600">
                  {[
                    "Answer each question carefully",
                    "Navigate with the Next/Previous buttons",
                    "Answer all questions before submitting",
                    "Your quiz is scored automatically the moment you submit",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="mt-0.5 font-bold text-blue-600">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => setQuizStarted(true)}
              >
                Start Quiz
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- in progress ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="fixed left-0 right-0 top-0 z-40 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">{quiz.title}</h2>
            <p className="text-sm text-slate-600">
              Question {questionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="font-mono text-base font-semibold tabular-nums text-slate-900">
              {formatTime(timeSpent)}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-24 max-w-4xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Question */}
          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-8">
              {/* Progress */}
              <div className="mb-8">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Progress</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {answeredCount}/{questions.length}
                  </span>
                </div>
                <Progress value={(answeredCount / questions.length) * 100} />
              </div>

              {currentQuestion && (
                <div className="mb-8">
                  <h3 className="mb-6 text-2xl font-bold text-slate-900">{currentQuestion.question}</h3>
                  {currentQuestion.difficulty && (
                    <div className="mb-6">
                      <Badge
                        tone={difficultyTone[currentQuestion.difficulty] ?? "neutral"}
                        className="capitalize"
                      >
                        {currentQuestion.difficulty}
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const selected = selectedForCurrent === index;
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(index)}
                          aria-pressed={selected}
                          className={`w-full rounded-xl border-2 p-4 text-left font-medium transition-all ${
                            selected
                              ? "border-blue-600 bg-blue-50 text-blue-900"
                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
                                selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                              }`}
                            >
                              {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                            </div>
                            <span>{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Navigator */}
          <div>
            <Card className="p-6 lg:sticky lg:top-24">
              <h4 className="mb-4 font-semibold text-slate-900">Questions</h4>
              <div className="mb-6 grid grid-cols-5 gap-2">
                {questions.map((_, index) => {
                  const isCurrent = index === questionIndex;
                  const isAnswered = index in answers;
                  return (
                    <button
                      key={index}
                      onClick={() => setQuestionIndex(index)}
                      aria-label={`Go to question ${index + 1}${isAnswered ? " (answered)" : ""}`}
                      aria-current={isCurrent ? "true" : undefined}
                      className={`aspect-square rounded-lg text-sm font-semibold transition-all ${
                        isCurrent
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                          : isAnswered
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoPrevious}
                  aria-label="Previous question"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext}
                  aria-label="Next question"
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <p className="mb-2 text-sm font-medium text-slate-600">Status:</p>
                <div className="mb-4 text-sm">
                  {isAllAnswered ? (
                    <p className="flex items-center gap-2 font-medium text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      All answered
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 font-medium text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      {questions.length - answeredCount} remaining
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {submitError}
                  </div>
                )}

                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!isAllAnswered}
                  loading={submitMutation.isPending}
                  onClick={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? "Submitting..." : "Complete Quiz"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
