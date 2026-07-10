"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllQuizzes, generateQuiz, Quiz, QuizDifficulty } from "@/config/services/quiz.service";
import { getRoadmaps } from "@/config/services/roadmap.service";

// Literal-string class maps (never interpolate Tailwind class names — DESIGN.md).
const difficultyBadge: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-red-100 text-red-700",
  mixed: "bg-blue-100 text-blue-700",
};

const DEFAULT_TOPICS = [
  "JavaScript Fundamentals",
  "Python Basics",
  "SQL & Databases",
  "Machine Learning Concepts",
  "Data Structures & Algorithms",
  "REST API Design",
];

function QuizCard({ quiz, onOpen }: { quiz: Quiz; onOpen: (id: string) => void }) {
  const badge = difficultyBadge[quiz.difficulty] || difficultyBadge.mixed;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all">
      <div className="h-28 bg-gradient-to-br from-blue-500 to-indigo-600 relative overflow-hidden">
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

      <div className="p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">{quiz.title}</h3>
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{quiz.description || quiz.topic}</p>

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
            <div className="text-sm font-semibold text-slate-900 capitalize">{quiz.difficulty}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {quiz.category && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">
              {quiz.category}
            </span>
          )}
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${badge}`}>
            {quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}
          </span>
        </div>

        <button
          onClick={() => onOpen(quiz._id)}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}

function QuizCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
      <div className="h-28 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="h-4 bg-slate-200 rounded w-full" />
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

// AI quiz generator modal — informational modal shell (blue icon circle), matching DESIGN.md.
function GenerateQuizModal({
  isOpen,
  onClose,
  suggestions,
}: {
  isOpen: boolean;
  onClose: () => void;
  suggestions: string[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("mixed");
  const [numQuestions, setNumQuestions] = useState(5);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      generateQuiz({ topic: topic.trim(), difficulty, numQuestions }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      router.push(`/quizzes/${res.data._id}`);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Failed to generate quiz. Please try again.");
    },
  });

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!topic.trim()) {
      setError("Enter a topic to generate a quiz");
      return;
    }
    setError("");
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div className="px-8 pt-8 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Generate an AI Quiz</h2>
          <p className="text-slate-600 text-sm">Pick a topic and let AI build a knowledge check for you.</p>
        </div>

        <div className="px-8 py-6 space-y-5">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. React Hooks, SQL Joins, Neural Networks"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900"
            />
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Suggestions from your roadmaps</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 8).map((s) => (
                  <button
                    key={s}
                    onClick={() => setTopic(s)}
                    className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100 hover:bg-blue-100 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty + count */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 bg-white"
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Questions</label>
              <select
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 bg-white"
              >
                {[3, 5, 8, 10, 15].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border border-red-100">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 rounded-b-3xl flex gap-3">
          <button
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={mutation.isPending}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              "Generate Quiz"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuizzesPage() {
  const router = useRouter();
  const [showGenerate, setShowGenerate] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["quizzes"],
    queryFn: getAllQuizzes,
  });

  const { data: roadmapData } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: getRoadmaps,
  });

  const quizzes = data?.data || [];

  // Topic suggestions: unique skills/tags across the user's saved roadmaps, else defaults.
  const suggestions = useMemo(() => {
    const roadmaps = roadmapData?.data || [];
    const set = new Set<string>();
    roadmaps.forEach((r) => {
      (r.tags || []).forEach((t) => set.add(t));
      r.roadmap?.steps?.forEach((s) => (s.skills || []).forEach((sk) => set.add(sk)));
    });
    const fromRoadmaps = Array.from(set);
    return fromRoadmaps.length > 0 ? fromRoadmaps : DEFAULT_TOPICS;
  }, [roadmapData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <GenerateQuizModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
        suggestions={suggestions}
      />

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <h2 className="text-4xl font-bold text-slate-900 mb-3">Master Your Skills with Quizzes</h2>
            <p className="text-lg text-slate-600 max-w-2xl">
              Test your knowledge, identify gaps, and improve with AI-generated quizzes tailored to your learning path.
            </p>
          </div>
          <button
            onClick={() => setShowGenerate(true)}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Generate New Quiz
          </button>
        </div>

        {/* Grid */}
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
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Quizzes Yet</h3>
            <p className="text-slate-600 text-center mb-6 max-w-sm">
              Generate your first AI quiz to test your knowledge on any topic from your roadmap.
            </p>
            <button
              onClick={() => setShowGenerate(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              Generate Your First Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz._id} quiz={quiz} onOpen={(id) => router.push(`/quizzes/${id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
