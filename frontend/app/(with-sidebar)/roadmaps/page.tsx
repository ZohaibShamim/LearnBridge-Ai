"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getRoadmaps, deleteRoadmap, SavedRoadmap } from "@/config/services/roadmap.service";

// Confirmation modal component
function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-200/50 flex items-center justify-center z-50 p-4"
      style={{ opacity: 1 }} // Added slight opacity to the background
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center pt-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4v2m0 4v2M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 text-center">
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm">{message}</p>
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Roadmap card component
function RoadmapCard({ roadmap }: { roadmap: SavedRoadmap }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteRoadmap(roadmap._id);
      // Invalidate the roadmaps query to refetch data in real-time
      await queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      setShowConfirm(false);
    } catch (error) {
      console.error("Failed to delete roadmap:", error);
      alert("Failed to delete roadmap. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  const handleView = () => {
    // Don't navigate if we're in the delete process or showing confirmation
    if (isDeleting || showConfirm) {
      return;
    }
    router.push(`/roadmaps/${roadmap._id}`);
  };

  const createdDate = new Date(roadmap.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const estimatedSteps = roadmap.roadmap.steps?.length || 0;

  return (
    <div
      onClick={!isDeleting && !showConfirm ? handleView : undefined}
      className={`group bg-white rounded-2xl shadow-sm border-slate-100 p-6 transition-all duration-300 ${
        !isDeleting && !showConfirm
          ? "cursor-pointer hover:shadow-lg hover:border-blue-200"
          : "cursor-not-allowed opacity-75"
      }`}
      role="button"
      tabIndex={!isDeleting && !showConfirm ? 0 : -1}
    >
      <ConfirmationModal
        isOpen={showConfirm}
        title="Delete Roadmap"
        message={`Are you sure you want to delete "${roadmap.jobTitle}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
            {roadmap.jobTitle}
          </h3>
          <p className="text-sm text-slate-500">{createdDate}</p>
        </div>
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
          title="Delete roadmap"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Career Goal */}
      {roadmap.roadmap.career_goal && (
        <p className="text-slate-700 mb-4 line-clamp-2">
          {roadmap.roadmap.career_goal}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Steps</p>
          <p className="text-lg font-bold text-slate-900">{estimatedSteps}</p>
        </div>
        {roadmap.roadmap.estimated_timeline && (
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-xs text-indigo-600 font-medium">Timeline</p>
            <p className="text-lg font-bold text-slate-900">
              {roadmap.roadmap.estimated_timeline}
            </p>
          </div>
        )}
        {roadmap.roadmap.current_level && (
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-purple-600 font-medium">Level</p>
            <p className="text-sm font-bold text-slate-900">
              {roadmap.roadmap.current_level}
            </p>
          </div>
        )}
      </div>

      {/* Tags */}
      {roadmap.tags && roadmap.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {roadmap.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-block px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-blue-600 group-hover:gap-3 transition-all">
        <span className="text-sm font-medium">View Roadmap</span>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-slate-400"
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
      <h3 className="text-xl font-bold text-slate-900 mb-2">No Roadmaps Yet</h3>
      <p className="text-slate-600 text-center mb-6 max-w-sm">
        You haven't saved any roadmaps yet. Upload your CV to generate and save a personalized learning roadmap.
      </p>
      <button
        onClick={() => router.push("/upload")}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25"
      >
        Generate Your First Roadmap
      </button>
    </div>
  );
}

// Error state component
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
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
      <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to Load</h3>
      <p className="text-slate-600 text-center mb-6 max-w-sm">
        Unable to load your roadmaps. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-xl transition-all"
      >
        Try Again
      </button>
    </div>
  );
}

// Main page component
export default function RoadmapsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: getRoadmaps,
    staleTime: 0, // Always consider data as stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: "always", // Always refetch on mount
  });

  const roadmaps = (data?.data as SavedRoadmap[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/50 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">
              My Roadmaps
            </h1>
            <p className="text-slate-600">
              {roadmaps.length} saved
              {roadmaps.length === 1 ? " roadmap" : " roadmaps"}
            </p>
          </div>
          <button
            onClick={() => router.push("/upload")}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25"
          >
            Generate New Roadmap
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm p-6 animate-pulse"
              >
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-6" />
                <div className="space-y-3">
                  <div className="h-4 bg-slate-200 rounded" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : roadmaps.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roadmaps.map((roadmap: SavedRoadmap) => (
              <RoadmapCard key={roadmap._id} roadmap={roadmap} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
