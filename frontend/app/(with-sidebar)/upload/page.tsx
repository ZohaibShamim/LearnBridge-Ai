"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  UploadCloud,
  Check,
  X,
  FileText,
  AlertCircle,
  AlertTriangle,
  Zap,
  Sparkles,
  BookOpen,
  Target,
} from "lucide-react";
import { uploadCV } from "@/config/services/cv.service";
import { Button, Card, IconChip, Modal, ModalIcon, ModalTitle } from "@/components/ui";
import { cn } from "@/lib/utils";

type RoleOption = "data_scientist" | "software_engineer" | "machine_learning" | "ai" | null;

const roleOptions = [
  { id: "data_scientist", label: "Data Scientist", color: "blue" },
  { id: "software_engineer", label: "Software Engineer", color: "purple" },
  { id: "machine_learning", label: "Machine Learning Engineer", color: "green" },
  { id: "ai", label: "AI Engineer", color: "orange" },
];

/**
 * Literal-string class lookup — Tailwind only ships classes it can see as
 * complete strings, so interpolated names like `border-${color}-600` are
 * silently dropped. Every state below is a full literal string.
 */
type RoleColor = "blue" | "purple" | "green" | "orange";
const roleStyles: Record<RoleColor, { option: string; grid: string; dot: string }> = {
  blue: {
    option: "border-blue-600 bg-blue-50 text-blue-900",
    grid: "border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-900 shadow-lg shadow-blue-500/20",
    dot: "border-blue-600 bg-blue-600",
  },
  purple: {
    option: "border-purple-600 bg-purple-50 text-purple-900",
    grid: "border-purple-600 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-900 shadow-lg shadow-purple-500/20",
    dot: "border-purple-600 bg-purple-600",
  },
  green: {
    option: "border-green-600 bg-green-50 text-green-900",
    grid: "border-green-600 bg-gradient-to-br from-green-50 to-green-100 text-green-900 shadow-lg shadow-green-500/20",
    dot: "border-green-600 bg-green-600",
  },
  orange: {
    option: "border-orange-600 bg-orange-50 text-orange-900",
    grid: "border-orange-600 bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900 shadow-lg shadow-orange-500/20",
    dot: "border-orange-600 bg-orange-600",
  },
};

// Role selection modal — Modal primitive (focus-trap / esc / scroll-lock built in)
function RoleSelectionModal({
  isOpen,
  selectedRole,
  onSelectRole,
  onClose,
}: {
  isOpen: boolean;
  selectedRole: RoleOption;
  onSelectRole: (role: RoleOption) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="md"
      labelledBy="role-modal-title"
    >
      <div className="p-6 sm:p-8">
        <ModalIcon tone="brand">
          <Target className="h-6 w-6" />
        </ModalIcon>
        <ModalTitle
          id="role-modal-title"
          className="mt-4 text-center text-2xl font-bold text-slate-900"
        >
          Choose Your Role
        </ModalTitle>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Select the career role you&apos;d like to generate a roadmap for.
        </p>

        <div role="radiogroup" aria-label="Career role" className="mt-6 space-y-3">
          {roleOptions.map((role) => {
            const selected = selectedRole === role.id;
            const style = roleStyles[role.color as RoleColor];
            return (
              <button
                key={role.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelectRole(role.id as RoleOption)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left text-sm font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  selected
                    ? style.option
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? style.dot : "border-slate-300"
                  )}
                >
                  {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                <span>{role.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!selectedRole} onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleOption>(null);
  const [showRoleModal, setShowRoleModal] = useState(true);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, role }: { file: File; role: string }) => {
      return uploadCV(file, role);
    },
    onSuccess: (response) => {
      console.log("[Upload Success]", response);
      router.push(`/roadmap/${response.data.jobId}`);
    },
    onError: (error: any) => {
      console.error("[Upload Error]", error);
      const errorMessage = error?.response?.data?.message || "Upload failed. Please try again.";
      setError(errorMessage);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFile(selectedFile);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPG, JPEG, PNG, PDF, and DOCX files are allowed");
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setError("");
    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  };

  const handleUpload = () => {
    if (!file || !selectedRole) {
      if (!selectedRole) {
        setError("Please select a role before uploading");
      }
      return;
    }
    setError("");
    uploadMutation.mutate({ file, role: selectedRole });
  };

  const handleSelectRole = (role: RoleOption) => {
    setSelectedRole(role);
  };

  const handleCloseRoleModal = () => {
      setShowRoleModal(false);
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openFilePicker = () => {
    if (selectedRole) fileInputRef.current?.click();
  };

  return (
    <div className="app-bg min-h-screen">
      {/* Role Selection Modal */}
      <RoleSelectionModal
        isOpen={showRoleModal}
        selectedRole={selectedRole}
        onSelectRole={handleSelectRole}
        onClose={handleCloseRoleModal}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Upload Your CV</h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg">
            Get a personalized learning roadmap powered by AI
          </p>
        </div>

        {/* Role Selection Section */}
        <div className="mb-10">
          <h2 className="mb-4 text-center text-lg font-semibold text-slate-900">
            {selectedRole ? "Selected role" : "Which role would you like to focus on?"}
          </h2>
          <div
            role="radiogroup"
            aria-label="Career role"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
          >
            {roleOptions.map((role) => {
              const selected = selectedRole === role.id;
              const style = roleStyles[role.color as RoleColor];
              return (
                <button
                  key={role.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleSelectRole(role.id as RoleOption)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-center text-sm font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                    selected
                      ? style.grid
                      : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {selected && <Check className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />}
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>
          {!selectedRole && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Please select a role to continue
            </p>
          )}
        </div>

        {/* Upload Card */}
        <Card className="p-5 sm:p-8">
          {!file ? (
            <div
              onDragEnter={!selectedRole ? undefined : handleDrag}
              onDragLeave={!selectedRole ? undefined : handleDrag}
              onDragOver={!selectedRole ? undefined : handleDrag}
              onDrop={!selectedRole ? undefined : handleDrop}
              onClick={openFilePicker}
              className={cn(
                "flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200 sm:py-16",
                !selectedRole
                  ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                  : dragActive
                  ? "scale-[1.01] cursor-pointer border-blue-500 bg-blue-50"
                  : "cursor-pointer border-slate-200 hover:border-blue-300 hover:bg-slate-50/80"
              )}
            >
              <IconChip className="h-16 w-16 rounded-2xl">
                <UploadCloud className="h-8 w-8" aria-hidden />
              </IconChip>

              {!selectedRole ? (
                <>
                  <h3 className="mt-6 text-lg font-semibold text-slate-600 sm:text-xl">
                    Select a role first
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Choose a career role above to enable file upload
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-6 text-lg font-semibold text-slate-900 sm:text-xl">
                    Drop your CV here
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500">
                    {dragActive ? "Release to add your file" : "or click to browse from your device"}
                  </p>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                onChange={handleFileChange}
                disabled={!selectedRole}
                className="hidden"
              />
              <Button
                size="lg"
                className="mt-6"
                disabled={!selectedRole}
                onClick={(e) => {
                  e.stopPropagation();
                  openFilePicker();
                }}
              >
                Choose File
              </Button>
              <p className="mt-6 text-xs text-slate-400">
                Supported: JPG, JPEG, PNG, PDF, DOCX (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div className="relative">
                {preview ? (
                  <img
                    src={preview}
                    alt="CV preview"
                    className="h-72 w-full rounded-2xl border border-slate-100 bg-slate-50 object-contain"
                  />
                ) : (
                  <div className="flex h-72 w-full items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                    <div className="text-center">
                      <FileText className="mx-auto h-16 w-16 text-slate-400" aria-hidden />
                      <p className="mt-3 font-medium text-slate-500">
                        {file?.name?.toLowerCase().endsWith(".docx")
                          ? "Word Document"
                          : "PDF Document"}
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Remove selected file"
                  onClick={handleRemove}
                  disabled={uploadMutation.isPending}
                  className="absolute right-3 top-3 h-9 w-9 bg-white text-slate-600 shadow-lg hover:bg-red-500 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>

              {/* File Info */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <IconChip>
                    <FileText className="h-5 w-5" aria-hidden />
                  </IconChip>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5 text-green-600">
                  <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  <span className="hidden text-sm font-medium sm:inline">Ready to upload</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden />
                  <span>{error}</span>
                </div>
              )}

              {/* Upload Button */}
              <Button
                size="lg"
                className="w-full"
                loading={uploadMutation.isPending}
                disabled={uploadMutation.isPending || !selectedRole}
                onClick={handleUpload}
              >
                {uploadMutation.isPending ? (
                  "Uploading CV..."
                ) : !selectedRole ? (
                  <>
                    <AlertTriangle className="h-5 w-5" aria-hidden />
                    Select a Role First
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" aria-hidden />
                    Generate My Roadmap
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Features */}
        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          <Card className="p-6 text-center">
            <IconChip className="mx-auto h-14 w-14 rounded-2xl">
              <Zap className="h-7 w-7" aria-hidden />
            </IconChip>
            <h3 className="mt-4 font-semibold text-slate-900">AI-Powered Analysis</h3>
            <p className="mt-2 text-sm text-slate-600">
              Advanced AI reads your skills, experience, and goals to map the gaps.
            </p>
          </Card>
          <Card className="p-6 text-center">
            <IconChip className="mx-auto h-14 w-14 rounded-2xl bg-purple-100 text-purple-600">
              <Sparkles className="h-7 w-7" aria-hidden />
            </IconChip>
            <h3 className="mt-4 font-semibold text-slate-900">Personalized Path</h3>
            <p className="mt-2 text-sm text-slate-600">
              A step-by-step roadmap tailored to the exact role you&apos;re targeting.
            </p>
          </Card>
          <Card className="p-6 text-center">
            <IconChip className="mx-auto h-14 w-14 rounded-2xl bg-orange-100 text-orange-600">
              <BookOpen className="h-7 w-7" aria-hidden />
            </IconChip>
            <h3 className="mt-4 font-semibold text-slate-900">Curated Resources</h3>
            <p className="mt-2 text-sm text-slate-600">
              Hand-picked YouTube videos and articles attached to every step.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
