"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Plus, GraduationCap, AlertTriangle } from "lucide-react";
import { getAllQuizzes, generateQuiz, Quiz, QuizDifficulty } from "@/config/services/quiz.service";
import { getRoadmaps } from "@/config/services/roadmap.service";
import {
  Button,
  Card,
  Badge,
  difficultyTone,
  Skeleton,
  EmptyState,
  Modal,
  ModalIcon,
  ModalTitle,
  ModalDescription,
  Slider,
} from "@/components/ui";

const DEFAULT_TOPICS = [
  "JavaScript Fundamentals",
  "Python Basics",
  "SQL & Databases",
  "Machine Learning Concepts",
  "Data Structures & Algorithms",
  "REST API Design",
];

function QuizCard({ quiz, onOpen }: { quiz: Quiz; onOpen: (id: string) => void }) {
  return (
    <Card interactive as="article" className="overflow-hidden">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600">
        <div className="absolute inset-0 opacity-10">
          <svg className="h-full w-full" viewBox="0 0 400 160" fill="none">
            <circle cx="50" cy="50" r="40" fill="white" />
            <circle cx="350" cy="120" r="60" fill="white" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="h-12 w-12 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="p-5">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-900">{quiz.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm text-slate-600">{quiz.description || quiz.topic}</p>

        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="mb-1 text-xs font-medium text-slate-500">Questions</div>
            <div className="text-lg font-semibold text-slate-900">{quiz.totalQuestions}</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-medium text-slate-500">Time</div>
            <div className="text-lg font-semibold text-slate-900">{quiz.estimatedTime}m</div>
          </div>
          <div className="text-center">
            <div className="mb-1 text-xs font-medium text-slate-500">Level</div>
            <div className="text-sm font-semibold capitalize text-slate-900">{quiz.difficulty}</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {quiz.category && <Badge tone="brand">{quiz.category}</Badge>}
          <Badge tone={difficultyTone[quiz.difficulty] ?? "brand"} className="capitalize">
            {quiz.difficulty}
          </Badge>
        </div>

        <Button variant="primary" className="w-full" onClick={() => onOpen(quiz._id)}>
          Start Quiz
        </Button>
      </div>
    </Card>
  );
}

function QuizCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-28 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="my-4 grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <Skeleton className="h-11 rounded-xl" />
      </div>
    </Card>
  );
}

// AI quiz generator — informational Modal (brand icon circle), matching DESIGN.md.
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
    mutationFn: () => generateQuiz({ topic: topic.trim(), difficulty, numQuestions }),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      router.push(`/quizzes/${res.data._id}`);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || "Failed to generate quiz. Please try again.");
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      setError("Enter a topic to generate a quiz");
      return;
    }
    setError("");
    mutation.mutate();
  };

  const selectClass =
    "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Modal
      open={isOpen}
      onOpenChange={(o) => {
        if (!o && !mutation.isPending) onClose();
      }}
      size="lg"
      className="max-h-[90vh] overflow-y-auto"
    >
      <div className="px-8 pb-6 pt-8 text-center">
        <ModalIcon tone="brand">
          <Sparkles className="h-7 w-7" />
        </ModalIcon>
        <ModalTitle className="mt-4 text-2xl font-bold text-slate-900">Generate an AI Quiz</ModalTitle>
        <ModalDescription className="mt-1 text-sm text-slate-600">
          Pick a topic and let AI build a knowledge check for you.
        </ModalDescription>
      </div>

      <div className="space-y-5 border-t border-slate-100 px-8 py-6">
        {/* Topic */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. React Hooks, SQL Joins, Neural Networks"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Suggestions from your roadmaps</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 8).map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty + count */}
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as QuizDifficulty)}
              className={selectClass}
            >
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Number of questions</label>
              <span className="tabular rounded-lg bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700">
                {numQuestions}
              </span>
            </div>
            <Slider
              value={numQuestions}
              onValueChange={setNumQuestions}
              min={3}
              max={15}
              step={1}
              ariaLabel="Number of questions"
            />
            <div className="mt-1.5 flex justify-between text-xs text-slate-400">
              <span>3</span>
              <span>15</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3 rounded-b-3xl bg-slate-50 px-8 py-6">
        <Button variant="secondary" className="flex-1" disabled={mutation.isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          loading={mutation.isPending}
          onClick={handleGenerate}
        >
          {mutation.isPending ? "Generating..." : "Generate Quiz"}
        </Button>
      </div>
    </Modal>
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

      <main className="mx-auto max-w-7xl px-4 py-12">
        {/* Hero */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="mb-3 text-4xl font-bold text-slate-900">Master Your Skills with Quizzes</h2>
            <p className="max-w-2xl text-lg text-slate-600">
              Test your knowledge, identify gaps, and improve with AI-generated quizzes tailored to your learning path.
            </p>
          </div>
          <Button variant="primary" className="shrink-0" onClick={() => setShowGenerate(true)}>
            <Plus className="h-5 w-5" />
            Generate New Quiz
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <QuizCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<AlertTriangle className="h-7 w-7" />}
            title="Failed to load quizzes"
            description="Something went wrong. Please try again later."
          />
        ) : quizzes.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-7 w-7" />}
            title="No quizzes yet"
            description="Generate your first AI quiz to test your knowledge on any topic from your roadmap."
            action={
              <Button variant="primary" onClick={() => setShowGenerate(true)}>
                Generate Your First Quiz
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <QuizCard key={quiz._id} quiz={quiz} onOpen={(id) => router.push(`/quizzes/${id}`)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
