"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { uploadCV } from "@/config/services/cv.service";
import { useAuthStore } from "@/store/auth";
import { clearAuthData } from "@/config/token/token";

export default function UploadPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: uploadCV,
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
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPG, JPEG, PNG, and PDF files are allowed");
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
    if (!file) return;
    setError("");
    uploadMutation.mutate(file);
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleLogout = () => {
    clearAuthData();
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              LearnBridge AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-slate-600">
                Welcome, <span className="font-medium text-slate-900">{user.firstName}</span>
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
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-slate-900 mb-3">
            Upload Your CV
          </h2>
          <p className="text-lg text-slate-600">
            Get a personalized learning roadmap powered by AI
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 ${
                dragActive
                  ? "border-blue-500 bg-blue-50 scale-[1.02]"
                  : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                  <svg
                    className="h-10 w-10 text-blue-600"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Drop your CV here
              </h3>
              <p className="text-slate-500 mb-6">or click to browse from your device</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                Choose File
              </button>
              <p className="text-xs text-slate-400 mt-6">
                Supported: JPG, JPEG, PNG, PDF (max 10MB)
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Preview */}
              <div className="relative">
                {preview ? (
                  <img
                    src={preview}
                    alt="CV Preview"
                    className="w-full h-72 object-contain rounded-2xl bg-slate-50 border border-slate-100"
                  />
                ) : (
                  <div className="w-full h-72 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-500 font-medium">PDF Document</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleRemove}
                  disabled={uploadMutation.isPending}
                  className="absolute top-3 right-3 bg-white hover:bg-red-500 text-slate-600 hover:text-white p-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* File Info */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">Ready to upload</span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-600 px-5 py-4 rounded-xl text-sm flex items-center gap-3 border border-red-100">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
              >
                {uploadMutation.isPending ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading CV...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate My Roadmap
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">AI-Powered Analysis</h3>
            <p className="text-sm text-slate-600">
              Advanced AI analyzes your skills, experience, and career goals
            </p>
          </div>
          <div className="text-center group">
            <div className="bg-gradient-to-br from-green-100 to-green-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Personalized Path</h3>
            <p className="text-sm text-slate-600">
              Custom roadmap tailored specifically to your career objectives
            </p>
          </div>
          <div className="text-center group">
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Curated Resources</h3>
            <p className="text-sm text-slate-600">
              YouTube videos and articles handpicked for your learning journey
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}