"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2, ChevronRight, Map, AlertTriangle } from "lucide-react";
import { getRoadmaps, deleteRoadmap, SavedRoadmap } from "@/config/services/roadmap.service";
import {
  Button,
  Card,
  Badge,
  EmptyState,
  Skeleton,
  Modal,
  ModalIcon,
  ModalTitle,
  ModalDescription,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// Delete confirmation — destructive Modal primitive (red icon + destructive confirm).
function DeleteRoadmapModal({
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
  return (
    <Modal
      open={isOpen}
      // Block dismissal (esc/scrim) while the delete is in flight.
      onOpenChange={(o) => {
        if (!o && !isLoading) onCancel();
      }}
      size="sm"
      showClose={false}
    >
      <div className="p-6 text-center">
        <ModalIcon tone="danger">
          <Trash2 className="h-6 w-6" />
        </ModalIcon>
        <ModalTitle className="mt-4 text-xl font-bold text-slate-900">
          {title}
        </ModalTitle>
        <ModalDescription className="mt-2 text-sm text-slate-600">
          {message}
        </ModalDescription>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            loading={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
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
  const clickable = !isDeleting && !showConfirm;

  return (
    <Card
      as="article"
      interactive={clickable}
      onClick={clickable ? handleView : undefined}
      role="button"
      tabIndex={clickable ? 0 : -1}
      className={cn(
        "group flex flex-col p-6",
        clickable ? "cursor-pointer" : "cursor-not-allowed opacity-75"
      )}
    >
      <DeleteRoadmapModal
        isOpen={showConfirm}
        title="Delete Roadmap"
        message={`Are you sure you want to delete "${roadmap.jobTitle}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />

      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-blue-600">
            {roadmap.jobTitle}
          </h3>
          <p className="text-sm text-slate-500">{createdDate}</p>
        </div>
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          aria-label="Delete roadmap"
          className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Career Goal */}
      {roadmap.roadmap.career_goal && (
        <p className="mb-4 line-clamp-2 text-slate-700">
          {roadmap.roadmap.career_goal}
        </p>
      )}

      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-600">Steps</p>
          <p className="text-lg font-bold text-slate-900">{estimatedSteps}</p>
        </div>
        {roadmap.roadmap.estimated_timeline && (
          <div className="rounded-lg bg-indigo-50 p-3">
            <p className="text-xs font-medium text-indigo-600">Timeline</p>
            <p className="text-lg font-bold text-slate-900">
              {roadmap.roadmap.estimated_timeline}
            </p>
          </div>
        )}
        {roadmap.roadmap.current_level && (
          <div className="rounded-lg bg-purple-50 p-3">
            <p className="text-xs font-medium text-purple-600">Level</p>
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
            <Badge key={index} tone="brand">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-blue-600 transition-all group-hover:gap-3">
        <span className="text-sm font-medium">View Roadmap</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </Card>
  );
}

// Skeleton card for the loading grid
function RoadmapCardSkeleton() {
  return (
    <Card className="p-6">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/2" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
      <Skeleton className="mt-4 h-4 w-1/3" />
    </Card>
  );
}

// Main page component
export default function RoadmapsPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
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
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6">
          <div>
            <h1 className="mb-1 text-3xl font-bold text-slate-900">
              My Roadmaps
            </h1>
            <p className="text-slate-600">
              {roadmaps.length} saved
              {roadmaps.length === 1 ? " roadmap" : " roadmaps"}
            </p>
          </div>
          <Button onClick={() => router.push("/upload")}>
            Generate New Roadmap
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <RoadmapCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={<AlertTriangle className="h-7 w-7" />}
            title="Failed to Load"
            description="Unable to load your roadmaps. Please try again."
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Try Again
              </Button>
            }
          />
        ) : roadmaps.length === 0 ? (
          <EmptyState
            icon={<Map className="h-7 w-7" />}
            title="No Roadmaps Yet"
            description="You haven't saved any roadmaps yet. Upload your CV to generate and save a personalized learning roadmap."
            action={
              <Button onClick={() => router.push("/upload")}>
                Generate Your First Roadmap
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {roadmaps.map((roadmap: SavedRoadmap) => (
              <RoadmapCard key={roadmap._id} roadmap={roadmap} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
