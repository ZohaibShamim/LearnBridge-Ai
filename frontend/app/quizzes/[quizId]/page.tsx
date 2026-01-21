"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

// Mock quiz data (replace with API later)
const mockQuiz = {
  _id: "mock-quiz-1",
  title: "Sample Quiz",
  description: "This is a mock quiz while the API is not ready.",
  category: "General",
  totalQuestions: 3,
  estimatedTime: 5,
  difficulty: "easy",
  questions: [
    {
      _id: "1",
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "22"],
      difficulty: "easy",
    },
    {
      _id: "2",
      question: "Capital of France?",
      options: ["Berlin", "Madrid", "Paris", "Rome"],
      difficulty: "easy",
    },
    {
      _id: "3",
      question: "Pick the color of the sky on a clear day.",
      options: ["Green", "Blue", "Red", "Yellow"],
      difficulty: "easy",
    },
  ],
};

interface QuestionState {
  questionIndex: number;
  selectedAnswer: string | null;
  answeredQuestions: { [key: number]: string };
}

export default function QuizTakerPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = (params.quizId as string) || mockQuiz._id;
  const { user } = useAuthStore();

  const [questionState, setQuestionState] = useState<QuestionState>({
    questionIndex: 0,
    selectedAnswer: null,
    answeredQuestions: {},
  });
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);

  // Using mock quiz instead of API
  const quiz = mockQuiz;
  const questions = quiz.questions || [];
  const currentQuestion = questions[questionState.questionIndex];

  // Timer effect
  useEffect(() => {
    if (!quizStarted) return;
    const timer = setInterval(() => setTimeSpent((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [quizStarted]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleAnswerSelect = (answer: string) => {
    setQuestionState((prev) => ({
      ...prev,
      selectedAnswer: answer,
    }));
  };

  const handleSubmitAnswer = async () => {
    if (!questionState.selectedAnswer || !currentQuestion) return;

    setQuestionState((prev) => ({
      ...prev,
      answeredQuestions: {
        ...prev.answeredQuestions,
        [prev.questionIndex]: prev.selectedAnswer!,
      },
      selectedAnswer: null,
    }));
  };

  const handleNext = () => {
    if (questionState.questionIndex < questions.length - 1) {
      const nextIndex = questionState.questionIndex + 1;
      setQuestionState((prev) => ({
        ...prev,
        questionIndex: nextIndex,
        selectedAnswer: prev.answeredQuestions[nextIndex] || null,
      }));
    }
  };

  const handlePrevious = () => {
    if (questionState.questionIndex > 0) {
      const prevIndex = questionState.questionIndex - 1;
      setQuestionState((prev) => ({
        ...prev,
        questionIndex: prevIndex,
        selectedAnswer: prev.answeredQuestions[prevIndex] || null,
      }));
    }
  };

  const handleCompleteQuiz = () => {
    alert("Mock complete! Replace with API call later.");
  };

  const isQuestionAnswered =
    questionState.questionIndex in questionState.answeredQuestions;
  const isAllAnswered = questions.length === Object.keys(questionState.answeredQuestions).length;
  const canGoNext = questionState.questionIndex < questions.length - 1;
  const canGoPrevious = questionState.questionIndex > 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Not started state
  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <button
          onClick={() => router.back()}
          className="mb-8 px-4 py-2 text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden p-8 flex flex-col justify-end">
              <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
                  <circle cx="100" cy="100" r="80" fill="white" />
                  <circle cx="350" cy="350" r="100" fill="white" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-white relative z-10 mb-2">
                {quiz.title}
              </h1>
              <p className="text-blue-100 relative z-10">{quiz.category}</p>
            </div>

            {/* Content */}
            <div className="p-8">
              <p className="text-lg text-slate-700 mb-8">{quiz.description}</p>

              {/* Quiz Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Questions</p>
                  <p className="text-2xl font-bold text-blue-600">{quiz.totalQuestions}</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Time Limit</p>
                  <p className="text-2xl font-bold text-green-600">{quiz.estimatedTime}m</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Difficulty</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {quiz.difficulty === "easy"
                      ? "⭐"
                      : quiz.difficulty === "medium"
                      ? "⭐⭐"
                      : "⭐⭐⭐"}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
                  <p className="text-sm text-slate-600 font-medium mb-1">Type</p>
                  <p className="text-2xl font-bold text-orange-600">Graded</p>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Instructions
                </h3>
                <ul className="space-y-2 text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Answer each question carefully</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>You can navigate between questions using the Next/Previous buttons</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Make sure to answer all questions before submitting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span>Your responses will be evaluated automatically</span>
                  </li>
                </ul>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartQuiz}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                Start Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz in progress
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-slate-900">{quiz.title}</h2>
            <p className="text-sm text-slate-600">
              Question {questionState.questionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono font-semibold text-slate-900">{formatTime(timeSpent)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-slate-600">Progress</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {Object.keys(questionState.answeredQuestions).length}/{questions.length}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                    style={{
                      width: `${(Object.keys(questionState.answeredQuestions).length / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  {currentQuestion.question}
                </h3>

                {/* Difficulty Indicator */}
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                    {currentQuestion.difficulty === "easy"
                      ? "Easy"
                      : currentQuestion.difficulty === "medium"
                      ? "Medium"
                      : "Hard"}
                  </span>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left font-medium ${
                        questionState.selectedAnswer === option
                          ? "border-blue-600 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            questionState.selectedAnswer === option
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300"
                          }`}
                        >
                          {questionState.selectedAnswer === option && (
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

              {/* Submit Answer Button */}
              <button
                onClick={handleSubmitAnswer}
                disabled={!questionState.selectedAnswer}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-green-500/25"
              >
                Submit Answer
              </button>
            </div>
          </div>

          {/* Sidebar - Question Navigator */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
              <h4 className="font-semibold text-slate-900 mb-4">Questions</h4>
              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      setQuestionState((prev) => ({
                        ...prev,
                        questionIndex: index,
                        selectedAnswer:
                          prev.answeredQuestions[index] || null,
                      }))
                    }
                    className={`aspect-square rounded-lg font-semibold text-sm transition-all ${
                      index === questionState.questionIndex
                        ? "bg-blue-600 text-white shadow-lg"
                        : index in questionState.answeredQuestions
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Navigation */}
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

              {/* Status */}
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
                    <p className="text-orange-600 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {questions.length - Object.keys(questionState.answeredQuestions).length} remaining
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCompleteQuiz}
                  disabled={!isAllAnswered}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 rounded-lg transition-all"
                >
                  Complete Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
