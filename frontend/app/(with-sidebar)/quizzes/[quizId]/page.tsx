"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQuizById, submitQuiz } from "@/config/services/quiz.service";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">Quiz not found</p>
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

  // --- start screen ---
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <button
          onClick={() => router.push("/quizzes")}
          className="mb-8 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden p-8 flex flex-col justify-end">
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
                  <circle cx="100" cy="100" r="80" fill="white" />
                  <circle cx="350" cy="350" r="100" fill="white" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white relative z-10 mb-2">{quiz.title}</h1>
              <p className="text-blue-100 relative z-10">{quiz.category || quiz.topic}</p>
            </div>

            <div className="p-8">
              <p className="text-lg text-slate-700 mb-8">{quiz.description || `Test your knowledge of ${quiz.topic}.`}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Questions</p>
                  <p className="text-2xl font-bold text-blue-600">{quiz.totalQuestions}</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Est. Time</p>
                  <p className="text-2xl font-bold text-green-600">{quiz.estimatedTime}m</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Difficulty</p>
                  <p className="text-lg font-bold text-purple-600 capitalize">{quiz.difficulty}</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Type</p>
                  <p className="text-lg font-bold text-orange-600">Graded</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Instructions
                </h3>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold mt-0.5">•</span><span>Answer each question carefully</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold mt-0.5">•</span><span>Navigate with the Next/Previous buttons</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold mt-0.5">•</span><span>Answer all questions before submitting</span></li>
                  <li className="flex items-start gap-2"><span className="text-blue-600 font-bold mt-0.5">•</span><span>Your quiz is scored automatically the moment you submit</span></li>
                </ul>
              </div>

              <button
                onClick={() => setQuizStarted(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- in progress ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-slate-900">{quiz.title}</h2>
            <p className="text-sm text-slate-600">Question {questionIndex + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono font-semibold text-slate-900">{formatTime(timeSpent)}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              {/* Progress */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-600">Progress</span>
                  <span className="text-sm font-semibold text-slate-900">{answeredCount}/{questions.length}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                    style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {currentQuestion && (
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-6">{currentQuestion.question}</h3>
                  {currentQuestion.difficulty && (
                    <div className="flex items-center gap-2 mb-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full capitalize">
                        {currentQuestion.difficulty}
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left font-medium ${
                          selectedForCurrent === index
                            ? "border-blue-600 bg-blue-50 text-blue-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedForCurrent === index ? "border-blue-600 bg-blue-600" : "border-slate-300"
                          }`}>
                            {selectedForCurrent === index && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigator */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
              <h4 className="font-semibold text-slate-900 mb-4">Questions</h4>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setQuestionIndex(index)}
                    className={`aspect-square rounded-lg font-semibold text-sm transition-all ${
                      index === questionIndex
                        ? "bg-blue-600 text-white shadow-lg"
                        : index in answers
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePrevious}
                  disabled={!canGoPrevious}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ← Previous
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="w-full px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next →
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="text-sm text-slate-600 mb-4">
                  <p className="font-medium mb-2">Status:</p>
                  {isAllAnswered ? (
                    <p className="text-green-600 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      All answered
                    </p>
                  ) : (
                    <p className="text-yellow-600 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {questions.length - answeredCount} remaining
                    </p>
                  )}
                </div>

                {submitError && (
                  <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs mb-3 border border-red-100">
                    {submitError}
                  </div>
                )}

                <button
                  onClick={() => submitMutation.mutate()}
                  disabled={!isAllAnswered || submitMutation.isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitMutation.isPending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Complete Quiz"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
