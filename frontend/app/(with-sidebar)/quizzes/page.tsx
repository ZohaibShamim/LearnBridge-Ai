"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getAllQuizzes, Quiz } from "@/config/services/quiz.service";
import { useAuthStore } from "@/store/auth";
import { clearAuthData } from "@/config/token/token";

// Quiz Card Component
function QuizCard({ quiz, onStart }: { quiz: Quiz; onStart: (quizId: string) => void }) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "⭐";
      case "medium":
        return "⭐⭐";
      case "hard":
        return "⭐⭐⭐";
      default:
        return "⭐";
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all">
      {/* Header with gradient background */}
      <div className="h-32 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 160" fill="none">
            <circle cx="50" cy="50" r="40" fill="white" />
            <circle cx="350" cy="120" r="60" fill="white" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-12 h-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
          {quiz.title}
        </h3>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
          {quiz.description}
        </p>

        {/* Meta Info */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
          <div className="text-center">
            <div className="text-slate-400 text-xs font-medium mb-1">Questions</div>
            <div className="text-lg font-semibold text-slate-900">{quiz.totalQuestions}</div>
          </div>
          <div className="text-center">
            <div className="text-slate-400 text-xs font-medium mb-1">Time</div>
            <div className="text-lg font-semibold text-slate-900">{quiz.estimatedTime}m</div>
          </div>
          <div className="text-center">
            <div className="text-slate-400 text-xs font-medium mb-1">Level</div>
            <div className="text-lg font-semibold text-slate-900">{getDifficultyIcon(quiz.difficulty)}</div>
          </div>
        </div>

        {/* Category and difficulty badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
            {quiz.category}
          </span>
          <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(quiz.difficulty)}`}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </span>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStart(quiz._id)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}

// Loading Skeleton
function QuizCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-32 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-full" />
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="grid grid-cols-3 gap-3 my-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-200 rounded" />
          ))}
        </div>
        <div className="h-10 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // const { data, isLoading, isError } = useQuery({
  //   queryKey: ["quizzes"],
  //   queryFn: getAllQuizzes,
  // });
  //
  // const quizzes = data?.data || [];

  const isLoading = false;
  const isError = false;

  const quizzes: Quiz[] = [
    {
      _id: "quiz-1",
      title: "JavaScript Basics",
      description: "Test your fundamentals of JS syntax, types, and scope.",
      category: "Programming",
      totalQuestions: 12,
      estimatedTime: 15,
      difficulty: "easy",
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: "quiz-2",
      title: "React Essentials",
      description: "Hooks, components, state, effects, and rendering patterns.",
      category: "Frontend",
      totalQuestions: 15,
      estimatedTime: 18,
      difficulty: "medium",
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: "quiz-3",
      title: "Data Structures",
      description: "Arrays, trees, graphs, complexity, and common algorithms.",
      category: "Computer Science",
      totalQuestions: 10,
      estimatedTime: 20,
      difficulty: "hard",
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  // Filter quizzes by category
  const filteredQuizzes = selectedCategory === "all"
    ? quizzes
    : quizzes.filter(q => q.category === selectedCategory);

  // Get unique categories
  const categories = Array.from(
    new Set(quizzes.map(q => q.category))
  );

  const handleStartQuiz = (quizId: string) => {
    router.push(`/quizzes/${quizId}`);
  };

  const handleLogout = () => {
    clearAuthData();
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      {/* <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              LearnBridge AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/upload")}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              Upload CV
            </button>
            {user && (
              <span className="text-sm text-slate-600 hidden md:block">
                {user.firstName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 cursor-pointer rounded-lg text-slate-600 hover:text-white hover:bg-red-500 text-sm font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header> */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-4xl font-bold text-slate-900 mb-3">
            Master Your Skills with Quizzes
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl">
            Test your knowledge, identify gaps, and improve through our carefully curated quizzes. Track your progress and watch your skills grow.
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <h3 className="font-semibold text-slate-900">Filter by Category</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300"
              }`}
            >
              All ({quizzes.length})
            </button>
            {categories.map((category) => {
              const count = quizzes.filter(q => q.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Quizzes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-50 text-red-600 px-6 py-8 rounded-2xl text-center border border-red-100">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold mb-1">Failed to load quizzes</h3>
            <p className="text-sm">Please try again later</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="bg-slate-50 text-slate-600 px-6 py-12 rounded-2xl text-center border border-slate-100">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold mb-1 text-slate-900">No quizzes found</h3>
            <p className="text-sm">Try selecting a different category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <QuizCard key={quiz._id} quiz={quiz} onStart={handleStartQuiz} />
            ))}
          </div>
        )}

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Total Quizzes</p>
                <p className="text-2xl font-bold text-slate-900">{quizzes.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Difficulty Levels</p>
                <p className="text-2xl font-bold text-slate-900">3</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-600 font-medium">Categories</p>
                <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
