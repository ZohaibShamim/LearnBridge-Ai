"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getRoadmapById } from "@/config/services/roadmap.service";
import { normalizeResources, RoadmapStep, Resource } from "@/config/services/cv.service";

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
            <svg
              className="w-6 h-6 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
            {resource.title || "Learning Resource"}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isYouTube ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
              }`}
            >
              {isYouTube ? "YouTube" : "Article"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate group-hover:text-blue-500">
            {resource.url}
          </p>
        </div>
        <svg
          className="w-5 h-5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-all group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </a>
  );
}

// Step card component
function StepCard({
  step,
  index,
  isLast,
}: {
  step: RoadmapStep;
  index: number;
  isLast: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const resources = normalizeResources(step.resources);

  return (
    <div className="relative">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-indigo-300" />
      )}

      <div className="flex gap-4">
        {/* Step number */}
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/30 z-10">
          {step.step_number || index + 1}
        </div>

        {/* Content */}
        <div className="flex-1 pb-8">
          <div
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-all"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="p-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                {step.duration && (
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full mb-2">
                    {step.duration}
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-slate-400 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {step.description && (
                  <p className="text-slate-600 text-sm">{step.description}</p>
                )}

                {step.skills && step.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm">
                      Skills to Learn
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {step.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {resources.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 text-sm">
                      Resources
                    </h4>
                    <div className="space-y-2">
                      {resources.map((resource, idx) => (
                        <ResourceCard key={idx} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Error state component
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50 to-orange-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
          <svg
            className="w-10 h-10 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/roadmaps")}
            className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl transition-all"
          >
            Back to Roadmaps
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading state component
function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-32 bg-slate-200 rounded animate-pulse mb-8" />

        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white mb-8 shadow-xl shadow-blue-500/20">
          <div className="h-10 w-64 bg-white/20 rounded animate-pulse mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-4 h-20 animate-pulse" />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="h-6 w-32 bg-slate-200 rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-24 shadow-sm animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main roadmap display
function RoadmapDisplay({ roadmapId }: { roadmapId: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roadmap", roadmapId],
    queryFn: () => getRoadmapById(roadmapId),
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data?.data) {
    return (
      <ErrorState
        message={(error as any)?.response?.data?.message || "Failed to load roadmap"}
        onRetry={() => refetch()}
      />
    );
  }

  const roadmap = data.data;
  const roadmapData = roadmap.roadmap;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-900">{roadmap.jobTitle}</h1>
          <button
            onClick={() => router.push("/roadmaps")}
            className="text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm"
          >
            View All
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white mb-8 shadow-xl shadow-blue-500/20">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Your Career Goal</p>
              <h1 className="text-2xl md:text-3xl font-bold">
                {roadmapData.career_goal}
              </h1>
            </div>
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
              <p className="text-white font-semibold">{roadmapData.steps?.length || 0} Steps</p>
            </div>
          </div>
        </div>

        {/* Roadmap Steps */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Your Learning Path
          </h2>

          <div className="space-y-0">
            {roadmapData.steps?.map((step, index) => (
              <StepCard
                key={index}
                step={step}
                index={index}
                isLast={index === roadmapData.steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Ready to start your journey?
          </h3>
          <p className="text-slate-600 mb-4">
            Begin with the first step and track your progress as you go.
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Start Learning Now
          </button>
        </div>
      </main>
    </div>
  );
}

// Main page component
export default function ViewRoadmapPage() {
  const params = useParams();
  const roadmapId = params.roadmapId as string;

  if (!roadmapId) {
    return (
      <ErrorState
        message="Invalid roadmap ID"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return <RoadmapDisplay roadmapId={roadmapId} />;
}
