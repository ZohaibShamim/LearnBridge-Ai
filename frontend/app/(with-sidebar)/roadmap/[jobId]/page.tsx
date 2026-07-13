"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getJobStatus, JobStatus, RoadmapStep, Resource, normalizeResources, convertRoleToTitle } from "@/config/services/cv.service";
import { saveRoadmap } from "@/config/services/roadmap.service";
import { SkillGapSection } from "@/components/SkillGap";
import {
  Zap,
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Save,
  ExternalLink,
  ArrowUp,
} from "lucide-react";
import {
  Button,
  Card,
  Badge,
  Progress,
  Spinner,
  toast,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// Step status type
type StepStatus = "pending" | "active" | "completed";

interface ProcessingStep {
  id: string;
  label: string;
  icon: string;
  status: StepStatus;
}

// Processing animation component - now accepts job status
function ProcessingAnimation({ jobStatus, hasExtractedText }: { jobStatus: string; hasExtractedText: boolean }) {
  // Define the steps with their conditions
  const getStepStatus = (stepId: string): StepStatus => {
    switch (stepId) {
      case "upload":
        // Upload is complete once we have any status
        return "completed";
      case "extract":
        // Text extraction is complete if we have extracted text
        if (hasExtractedText) return "completed";
        if (jobStatus === "processing") return "active";
        return "pending";
      case "analyze":
        // Analyzing happens after text extraction
        if (hasExtractedText && jobStatus === "processing") return "active";
        if (jobStatus === "completed") return "completed";
        return "pending";
      case "generate":
        // Generating roadmap
        if (hasExtractedText && jobStatus === "processing") return "active";
        if (jobStatus === "completed") return "completed";
        return "pending";
      case "resources":
        // Finding resources is the last step
        if (jobStatus === "completed") return "completed";
        if (hasExtractedText && jobStatus === "processing") return "active";
        return "pending";
      default:
        return "pending";
    }
  };

  const steps: ProcessingStep[] = [
    { id: "upload", label: "CV Uploaded", icon: "📄", status: getStepStatus("upload") },
    { id: "extract", label: hasExtractedText ? "Text Extracted" : "Extracting text...", icon: "🔍", status: getStepStatus("extract") },
    { id: "analyze", label: hasExtractedText ? "Analyzing skills..." : "Analyzing skills", icon: "🧠", status: getStepStatus("analyze") },
    { id: "generate", label: "Generating roadmap...", icon: "🗺️", status: getStepStatus("generate") },
    { id: "resources", label: "Finding resources...", icon: "📚", status: getStepStatus("resources") },
  ];

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const overallPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8 text-center">
        {/* Brand mark */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <span className="absolute -inset-1 -z-10 rounded-3xl bg-blue-500/20 blur-lg animate-pulse" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Creating Your Roadmap
        </h2>
        <p className="text-slate-600 mb-6">
          Our AI is analyzing your CV and crafting a personalized learning path just for you.
        </p>

        {/* Overall progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Progress</span>
            <span className="text-xs font-bold text-slate-700">{overallPct}%</span>
          </div>
          <Progress value={overallPct} />
        </div>

        {/* Progress Steps */}
        <div className="space-y-2.5 mb-6 text-left">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500",
                step.status === "active"
                  ? "bg-blue-50 border-blue-200 shadow-sm"
                  : step.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-slate-100"
              )}
            >
              <span className="text-xl">{step.icon}</span>
              <span
                className={cn(
                  "flex-1 text-sm font-medium",
                  step.status === "active"
                    ? "text-blue-700"
                    : step.status === "completed"
                    ? "text-green-700"
                    : "text-slate-400"
                )}
              >
                {step.status === "completed" && step.id === "extract" ? "Text Extracted" : step.label}
              </span>
              {step.status === "active" && <Spinner className="h-4 w-4" />}
              {step.status === "completed" && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-500">
          {hasExtractedText
            ? "AI is generating your personalized roadmap..."
            : "This usually takes 30-60 seconds..."}
        </p>
      </Card>
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
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          Something went wrong
        </h2>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={onRetry}>Try Again</Button>
          <Button variant="secondary" onClick={() => router.push("/upload")}>
            Upload New CV
          </Button>
        </div>
      </div>
    </div>
  );
}

// Resource card component - Enhanced with visible URL
function ResourceCard({ resource }: { resource: Resource }) {
  const isYouTube = resource.type === "youtube" || resource.url?.includes("youtube.com") || resource.url?.includes("youtu.be");

  // Extract domain from URL for display
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-4 rounded-xl bg-slate-50 hover:bg-white transition-all border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100"
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isYouTube ? "bg-red-100" : "bg-blue-100"
        }`}>
          {isYouTube ? (
            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
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
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              isYouTube 
                ? "bg-red-100 text-red-700" 
                : "bg-blue-100 text-blue-700"
            }`}>
              {isYouTube ? "YouTube" : "Article"}
            </span>
            <span className="text-slate-400 truncate">
              {getDomain(resource.url)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 truncate group-hover:text-blue-500">
            {resource.url}
          </p>
        </div>
        <ExternalLink className="h-5 w-5 flex-shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500" />
      </div>
    </a>
  );
}

// Step card component
function StepCard({ step, index, isLast }: { step: RoadmapStep; index: number; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(index === 0);
  
  // Normalize resources to array format
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
          <Card
            className="overflow-hidden cursor-pointer transition-all hover:shadow-[var(--shadow-lg)]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {/* Header */}
            <div className="p-5 flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {step.title}
                </h3>
                {step.duration && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    {step.duration}
                  </div>
                )}
              </div>
              <ChevronDown
                className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Description */}
                <p className="text-slate-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Skills */}
                {step.skills && step.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Skills to Learn</h4>
                    <div className="flex flex-wrap gap-2">
                      {step.skills.map((skill, i) => (
                        <Badge key={i} tone="brand">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources - Enhanced display */}
                {resources.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Learning Resources ({resources.length})
                    </h4>
                    <div className="space-y-3">
                      {resources.map((resource, i) => (
                        <ResourceCard key={i} resource={resource} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

// Main roadmap display
function RoadmapDisplay({ job }: { job: JobStatus }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const roadmap = job.roadmap;
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveRoadmap = async () => {
    if (!roadmap) return;

    setIsSaving(true);

    try {
      const jobTitle = convertRoleToTitle(job.role);

      await saveRoadmap({
        jobTitle: jobTitle,
        roadmap: roadmap,
        description: `AI-generated roadmap for ${roadmap.career_goal}`,
        tags: job.tags || [],
        extractedSkills: job.extractedSkills || [],
        missingSkills: job.missingSkills || [],
      });

      // Invalidate roadmaps query to show the new roadmap in real-time
      await queryClient.invalidateQueries({ queryKey: ["roadmaps"] });

      toast.success("Roadmap saved successfully!");
    } catch (error) {
      console.error("Failed to save roadmap:", error);
      toast.error("Failed to save roadmap. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!roadmap) {
    return <ErrorState message="Roadmap data is missing" onRetry={() => router.refresh()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white mb-8 shadow-xl shadow-blue-500/20">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Your Career Goal</p>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {roadmap.career_goal}
                </h1>
              </div>
            </div>
            {/* Secondary (not gradient) so it doesn't compete with the hero — DESIGN.md: one gradient moment per screen. */}
            <Button
              variant="secondary"
              size="sm"
              className="flex-shrink-0"
              onClick={handleSaveRoadmap}
              loading={isSaving}
            >
              {!isSaving && <Save className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Roadmap"}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {roadmap.current_level && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-blue-100 text-xs font-medium mb-1">Current Level</p>
                <p className="text-white font-semibold">{roadmap.current_level}</p>
              </div>
            )}
            {roadmap.estimated_timeline && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-blue-100 text-xs font-medium mb-1">Est. Timeline</p>
                <p className="text-white font-semibold">{roadmap.estimated_timeline}</p>
              </div>
            )}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-blue-100 text-xs font-medium mb-1">Total Steps</p>
              <p className="text-white font-semibold">{roadmap.steps?.length || 0} Steps</p>
            </div>
          </div>
        </div>

        {/* Skill extraction + gap */}
        <SkillGapSection extractedSkills={job.extractedSkills} missingSkills={job.missingSkills} />

        {/* Roadmap Steps */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Your Learning Path
          </h2>

          <div className="space-y-0">
            {roadmap.steps?.map((step, index) => (
              <StepCard
                key={index}
                step={step}
                index={index}
                isLast={index === roadmap.steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Ready to start your journey?
          </h3>
          <p className="text-slate-600 mb-4">
            Begin with the first step and track your progress as you go.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <ArrowUp className="h-4 w-4" />
              Start Learning Now
            </Button>
            <Button variant="secondary" onClick={() => router.push("/roadmaps")}>
              View All Roadmaps
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

// Main page component
export default function RoadmapPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJobStatus(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      // Stop polling if completed or failed
      if (status === "completed" || status === "failed") {
        return false;
      }
      // Poll every 2 seconds while processing for faster updates
      return 2000;
    },
    retry: 3,
    enabled: !!jobId,
  });

  // Get current job data
  const jobData = data?.data;
  const jobStatus = jobData?.status || "uploaded";
  const hasExtractedText = !!jobData?.extractedText;

  // Show loading/processing animation with real status
  if (isLoading || (jobStatus !== "completed" && jobStatus !== "failed")) {
    return <ProcessingAnimation jobStatus={jobStatus} hasExtractedText={hasExtractedText} />;
  }

  // Show error state
  if (isError) {
    return (
      <ErrorState
        message={(error as any)?.response?.data?.message || "Failed to load roadmap"}
        onRetry={() => refetch()}
      />
    );
  }

  // Show error if job failed
  if (jobStatus === "failed") {
    return (
      <ErrorState
        message={jobData?.error || "Failed to generate roadmap"}
        onRetry={() => router.push("/upload")}
      />
    );
  }

  // Show roadmap
  return <RoadmapDisplay job={jobData!} />;
}
