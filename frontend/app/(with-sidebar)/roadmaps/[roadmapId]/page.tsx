"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getRoadmapById,
  updateRoadmapProgress,
  SavedRoadmap,
} from "@/config/services/roadmap.service";
import { getOrCreateSubtopicQuiz } from "@/config/services/quiz.service";
import type { Difficulty } from "@/config/services/quiz.service";
import { normalizeResources, RoadmapStep, Resource, Subtopic } from "@/config/services/cv.service";
import { SkillGapSection } from "@/components/SkillGap";
import { Button, Card, Badge, Progress, Skeleton } from "@/components/ui";
import { ArrowLeft, ChevronDown, Check, Lock, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Difficulty button styles as LITERAL strings — never interpolate Tailwind class names
// (dynamically-built classes silently don't render; see frontend CLAUDE.md §6).
const DIFF_STYLES: Record<Difficulty, string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  medium: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
  hard: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
};

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

// Resource card component
function ResourceCard({ resource }: { resource: Resource }) {
  const isYouTube =
    resource.type === "youtube" ||
    resource.url?.includes("youtube.com") ||
    resource.url?.includes("youtu.be");

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 rounded-xl bg-slate-50 hover:bg-white transition-all border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100"
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isYouTube ? "bg-red-100" : "bg-blue-100"
          }`}
        >
          {isYouTube ? (
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
            {resource.title || "Learning Resource"}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isYouTube ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
              {isYouTube ? "YouTube" : "Article"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate group-hover:text-blue-500">{resource.url}</p>
        </div>
        <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-all group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </div>
    </a>
  );
}

// --- FLAT (legacy) step card: for roadmaps saved before subtopics existed -------------
// Completion-aware (green node + Mark Complete toggle).
function StepCard({
  step,
  index,
  isLast,
  isCompleted,
  onToggle,
  isPending,
}: {
  step: RoadmapStep;
  index: number;
  isLast: boolean;
  isCompleted: boolean;
  onToggle: (index: number, completed: boolean) => void;
  isPending: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  const resources = normalizeResources(step.resources);

  return (
    <div className="relative">
      {!isLast && (
        <div className={`absolute left-6 top-16 bottom-0 w-0.5 ${isCompleted ? "bg-green-400" : "bg-gradient-to-b from-blue-300 to-indigo-300"}`} />
      )}

      <div className="flex gap-4">
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 ${
            isCompleted
              ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
              : "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30"
          }`}
        >
          {isCompleted ? (
            <Check className="h-6 w-6" strokeWidth={3} />
          ) : (
            step.step_number || index + 1
          )}
        </div>

        <div className="flex-1 pb-8">
          <Card className={cn("overflow-hidden", isCompleted ? "border-green-200" : "border-slate-100")}>
            <div className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/50" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-bold text-slate-900">{step.title}</h3>
                  {isCompleted && <Badge tone="success">Completed</Badge>}
                </div>
                {step.duration && <Badge tone="brand">{step.duration}</Badge>}
              </div>
              <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {step.description && <p className="text-slate-600 text-sm">{step.description}</p>}

                {step.skills && step.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm">Skills to Learn</h4>
                    <div className="flex flex-wrap gap-2">
                      {step.skills.map((skill, idx) => (
                        <Badge key={idx} tone="purple">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {resources.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm">Resources</h4>
                    <div className="space-y-2">
                      {resources.map((resource, idx) => (
                        <ResourceCard key={idx} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(index, !isCompleted);
                  }}
                  disabled={isPending}
                  className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-60 ${
                    isCompleted
                      ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                  }`}
                >
                  {isCompleted ? "✓ Completed — mark as incomplete" : "Mark this step complete"}
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- GUIDED subtopic row: three difficulty launchers + cleared state ------------------
function SubtopicRow({
  sub,
  stepIndex,
  cleared,
  locked,
  badgeEarned,
  onStart,
  pendingKey,
}: {
  sub: Subtopic;
  stepIndex: number;
  cleared: boolean;
  locked: boolean;
  badgeEarned: boolean;
  onStart: (stepIndex: number, subtopicId: string, difficulty: Difficulty) => void;
  pendingKey: string | null;
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${cleared ? "border-green-200 bg-green-50/40" : "border-slate-100 bg-slate-50/40"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 text-sm">{sub.title}</p>
          {sub.summary && <p className="text-slate-500 text-xs mt-0.5">{sub.summary}</p>}
        </div>
        {cleared && (
          <Badge tone="success" className="flex-shrink-0" icon={<Check className="h-3 w-3" />}>
            Cleared
          </Badge>
        )}
      </div>

      {/* Scraped learning resources for this subtopic */}
      {(() => {
        const res = normalizeResources(sub.resources);
        return res.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {res.map((r, i) => {
              const yt = r.type === "youtube" || r.url?.includes("youtu");
              return (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${yt ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"}`}
                >
                  {yt ? "▶ Watch" : "📄 Read"}
                </a>
              );
            })}
          </div>
        ) : null;
      })()}

      <div className="flex flex-wrap gap-2 mt-3">
        {DIFFICULTIES.map((d) => {
          const key = `${stepIndex}:${sub._id}:${d}`;
          const isPending = pendingKey === key;
          return (
            <button
              key={d}
              disabled={locked || isPending}
              onClick={() => onStart(stepIndex, sub._id, d)}
              aria-label={`Start ${d} quiz for ${sub.title}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all disabled:opacity-50 disabled:cursor-not-allowed ${DIFF_STYLES[d]}`}
            >
              {isPending ? "Loading…" : d}
              {d === "hard" ? " ⭐" : ""}
            </button>
          );
        })}
      </div>

      {!locked && (
        <p className="text-[11px] text-slate-400 mt-2">
          Pass Medium (60%+) to clear · {badgeEarned ? "Hard badge earned ⭐" : "Pass Hard to earn the topic badge ⭐"}
        </p>
      )}
    </div>
  );
}

// --- GUIDED topic card: subtopics + lock + badge ------------------------------------
function SubtopicStepCard({
  step,
  index,
  isLast,
  locked,
  prevTitle,
  clearedSet,
  badgeEarned,
  onStart,
  pendingKey,
}: {
  step: RoadmapStep;
  index: number;
  isLast: boolean;
  locked: boolean;
  prevTitle: string;
  clearedSet: Set<string>;
  badgeEarned: boolean;
  onStart: (stepIndex: number, subtopicId: string, difficulty: Difficulty) => void;
  pendingKey: string | null;
}) {
  const subtopics = step.subtopics || [];
  const clearedCount = subtopics.filter((s) => clearedSet.has(`${index}:${s._id}`)).length;
  const allCleared = subtopics.length > 0 && clearedCount === subtopics.length;
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const nodeStyle = locked
    ? "bg-gradient-to-br from-slate-300 to-slate-400 shadow-slate-300/30"
    : allCleared
      ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/30"
      : "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/30";

  return (
    <div className="relative">
      {!isLast && (
        <div className={`absolute left-6 top-16 bottom-0 w-0.5 ${allCleared ? "bg-green-400" : "bg-gradient-to-b from-blue-300 to-indigo-300"}`} />
      )}

      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg z-10 ${nodeStyle}`}>
          {locked ? (
            <Lock className="h-5 w-5" />
          ) : allCleared ? (
            <Check className="h-6 w-6" strokeWidth={3} />
          ) : (
            step.step_number || index + 1
          )}
        </div>

        <div className="flex-1 pb-8">
          <Card className={cn("overflow-hidden", allCleared ? "border-green-200" : locked ? "border-slate-200" : "border-slate-100")}>
            <div className="p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-50/50" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className={`font-bold ${locked ? "text-slate-400" : "text-slate-900"}`}>{step.title}</h3>
                  {badgeEarned && (
                    <Badge tone="warning" icon={<Star className="h-3 w-3 fill-current" />}>Badge</Badge>
                  )}
                  {locked && (
                    <Badge tone="neutral" icon={<Lock className="h-3 w-3" />}>Locked</Badge>
                  )}
                </div>
                <Badge tone="brand">
                  {clearedCount} / {subtopics.length} subtopics cleared
                </Badge>
              </div>
              <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-3">
                {step.description && <p className="text-slate-600 text-sm">{step.description}</p>}

                {locked && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-500">
                    🔒 Complete <span className="font-medium text-slate-700">{prevTitle}</span> to unlock this topic.
                  </div>
                )}

                <div className="space-y-2">
                  {subtopics.map((sub) => (
                    <SubtopicRow
                      key={sub._id}
                      sub={sub}
                      stepIndex={index}
                      cleared={clearedSet.has(`${index}:${sub._id}`)}
                      locked={locked}
                      badgeEarned={badgeEarned}
                      onStart={onStart}
                      pendingKey={pendingKey}
                    />
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Something went wrong</h2>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={onRetry}>Try Again</Button>
          <Button variant="secondary" onClick={() => router.push("/roadmaps")}>Back to Roadmaps</Button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 mb-8">
          <Skeleton className="h-10 w-64 bg-white/20 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-20 rounded-xl bg-white/10" />))}
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-24 rounded-2xl" />))}
        </div>
      </div>
    </div>
  );
}

// Content — branches between the guided (subtopic) view and the legacy flat view.
function RoadmapContent({ roadmap }: { roadmap: SavedRoadmap }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const roadmapData = roadmap.roadmap;
  const steps = roadmapData.steps || [];
  const totalSteps = steps.length;

  const hasSubtopics = steps.some((s) => s.subtopics && s.subtopics.length > 0);

  // --- guided (subtopic) state ---
  const clearedSet = new Set(
    (roadmap.clearedSubtopics || []).map((c) => `${c.stepIndex}:${c.subtopicId}`)
  );
  const badgedSteps = new Set((roadmap.badges || []).map((b) => b.stepIndex));
  const totalSubtopics = steps.reduce((sum, s) => sum + (s.subtopics?.length || 0), 0);
  const clearedCount = (roadmap.clearedSubtopics || []).length;
  const subtopicPercentage = totalSubtopics > 0 ? Math.round((clearedCount / totalSubtopics) * 100) : 0;

  const topicUnlocked = (index: number): boolean => {
    if (index <= 0) return true;
    const prev = steps[index - 1];
    if (!prev || !prev.subtopics || prev.subtopics.length === 0) return true;
    return prev.subtopics.every((sub) => clearedSet.has(`${index - 1}:${sub._id}`));
  };

  const [launchError, setLaunchError] = useState<string | null>(null);
  const startQuiz = useMutation({
    mutationFn: (v: { stepIndex: number; subtopicId: string; difficulty: Difficulty }) =>
      getOrCreateSubtopicQuiz({ roadmapId: roadmap._id, ...v }),
    onMutate: () => setLaunchError(null),
    onSuccess: (res) => {
      if (res?.data?._id) router.push(`/quizzes/${res.data._id}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Couldn't start the quiz. Please try again.";
      setLaunchError(msg);
    },
  });
  const pendingKey =
    startQuiz.isPending && startQuiz.variables
      ? `${startQuiz.variables.stepIndex}:${startQuiz.variables.subtopicId}:${startQuiz.variables.difficulty}`
      : null;
  const handleStart = (stepIndex: number, subtopicId: string, difficulty: Difficulty) =>
    startQuiz.mutate({ stepIndex, subtopicId, difficulty });

  // --- legacy flat state ---
  const [completed, setCompleted] = useState<Set<number>>(
    () => new Set((roadmap.completedSteps || []).filter((i) => i >= 0 && i < totalSteps))
  );
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const flatMutation = useMutation({
    mutationFn: ({ stepIndex, value }: { stepIndex: number; value: boolean }) =>
      updateRoadmapProgress(roadmap._id, stepIndex, value),
    onSettled: () => {
      setPendingIndex(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (_err, variables) => {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (variables.value) next.delete(variables.stepIndex);
        else next.add(variables.stepIndex);
        return next;
      });
    },
  });
  const handleToggle = (index: number, value: boolean) => {
    setPendingIndex(index);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (value) next.add(index);
      else next.delete(index);
      return next;
    });
    flatMutation.mutate({ stepIndex: index, value });
  };

  // --- shared progress numbers (branch on mode) ---
  const percentage = hasSubtopics
    ? subtopicPercentage
    : totalSteps > 0 ? Math.round((completed.size / totalSteps) * 100) : 0;
  const progressLabel = hasSubtopics
    ? `${clearedCount} of ${totalSubtopics} subtopics · ${percentage}%`
    : `${completed.size} of ${totalSteps} steps · ${percentage}%`;

  const badges = roadmap.badges || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900">{roadmap.jobTitle}</h1>
          <button onClick={() => router.push("/roadmaps")} className="text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm">View All</button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero with progress */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white mb-8 shadow-xl shadow-blue-500/20">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Your Career Goal</p>
              <h1 className="text-2xl md:text-3xl font-bold">{roadmapData.career_goal}</h1>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-blue-100 text-sm font-medium">Your Progress</span>
              <span className="text-white font-bold">{progressLabel}</span>
            </div>
            <Progress value={percentage} tone="success" className="h-3 bg-white/20" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {roadmapData.current_level && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-blue-100 text-xs font-medium mb-1">Current Level</p>
                <p className="text-white font-semibold">{roadmapData.current_level}</p>
              </div>
            )}
            {roadmapData.estimated_timeline && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-blue-100 text-xs font-medium mb-1">Est. Timeline</p>
                <p className="text-white font-semibold">{roadmapData.estimated_timeline}</p>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-blue-100 text-xs font-medium mb-1">Total Steps</p>
              <p className="text-white font-semibold">{totalSteps} Steps</p>
            </div>
          </div>
        </div>

        {/* Badges strip (guided mode only) */}
        {hasSubtopics && (
          <Card className="p-5 mb-8">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> Topic Badges
            </h3>
            {badges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <Badge key={b.stepIndex} tone="warning" icon={<Star className="h-3 w-3 fill-current" />}>
                    {b.title}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Pass a <span className="font-medium text-rose-600">Hard</span> quiz on any subtopic to earn your first topic badge.</p>
            )}
          </Card>
        )}

        {/* Skill extraction + gap */}
        <SkillGapSection extractedSkills={roadmap.extractedSkills} missingSkills={roadmap.missingSkills} />

        {/* Launch error */}
        {launchError && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
            {launchError}
          </div>
        )}

        {/* Steps */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Your Learning Path
          </h2>

          <div className="space-y-0">
            {steps.map((step, index) =>
              hasSubtopics ? (
                <SubtopicStepCard
                  key={index}
                  step={step}
                  index={index}
                  isLast={index === steps.length - 1}
                  locked={!topicUnlocked(index)}
                  prevTitle={steps[index - 1]?.title || "the previous topic"}
                  clearedSet={clearedSet}
                  badgeEarned={badgedSteps.has(index)}
                  onStart={handleStart}
                  pendingKey={pendingKey}
                />
              ) : (
                <StepCard
                  key={index}
                  step={step}
                  index={index}
                  isLast={index === steps.length - 1}
                  isCompleted={completed.has(index)}
                  onToggle={handleToggle}
                  isPending={pendingIndex === index}
                />
              )
            )}
          </div>
        </div>

        {/* Completion banner */}
        {totalSteps > 0 && percentage === 100 ? (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-8 text-center text-white shadow-lg shadow-green-500/20">
            <h3 className="text-2xl font-bold mb-2">🎉 Roadmap Complete!</h3>
            <p className="text-green-50">
              {hasSubtopics
                ? "You've cleared every subtopic. Chase the Hard badges you haven't earned yet!"
                : "You've completed every step. Time to put your skills to the test with a quiz."}
            </p>
            {!hasSubtopics && (
              <button onClick={() => router.push("/quizzes")} className="mt-4 px-6 py-3 bg-white text-green-700 font-semibold rounded-xl hover:bg-green-50 transition-all">
                Take a Quiz
              </button>
            )}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Keep going!</h3>
            <p className="text-slate-600">
              {hasSubtopics
                ? "Pass each subtopic's Medium quiz to clear it and unlock the next topic. Your progress shows on your dashboard."
                : "Mark steps complete as you finish them — your progress shows up on your dashboard."}
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}

function RoadmapDisplay({ roadmapId }: { roadmapId: string }) {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roadmap", roadmapId],
    queryFn: () => getRoadmapById(roadmapId),
    // Refetch when the user returns from taking a quiz so progress/badges update.
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !data?.data) {
    return <ErrorState message={(error as any)?.response?.data?.message || "Failed to load roadmap"} onRetry={() => refetch()} />;
  }
  return <RoadmapContent roadmap={data.data as SavedRoadmap} />;
}

export default function ViewRoadmapPage() {
  const params = useParams();
  const roadmapId = params.roadmapId as string;
  if (!roadmapId) {
    return <ErrorState message="Invalid roadmap ID" onRetry={() => window.location.reload()} />;
  }
  return <RoadmapDisplay roadmapId={roadmapId} />;
}
