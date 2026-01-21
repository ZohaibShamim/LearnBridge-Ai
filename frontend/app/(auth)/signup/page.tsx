"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "@/config/services/auth.service";

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
      type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
    }`}>
      {message}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    degree: "",
    institute: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (response) => {
      console.log("[Register Success]", response);
      setToast({ message: response.message || "Account created successfully!", type: "success" });
      
      // Redirect to login after successful registration
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    },
    onError: (error: any) => {
      console.log("[Register Error]", error);
      const errorMessage = error?.response?.data?.message || "Registration failed. Please try again.";
      setToast({ message: errorMessage, type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }
    if (formData.password.length < 8) {
      setToast({ message: "Password must be at least 8 characters", type: "error" });
      return;
    }

    console.log("[Form Submit]", formData);
    
    registerMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      degree: formData.degree,
      institute: formData.institute,
      email: formData.email,
      password: formData.password,
    });
  };

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-900">LearnBridge AI</h1>
            <p className="text-slate-600">Create your account</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    First Name
                  </label>
                  <input
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Last Name
                  </label>
                  <input
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Degree
                  </label>
                  <input
                    name="degree"
                    value={formData.degree}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="B.Sc / M.Sc / B.Tech"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Institute
                  </label>
                  <input
                    name="institute"
                    value={formData.institute}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="University / College"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-10 cursor-pointer text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-7-11-7a17.9 17.9 0 013.832-4.98M6.1 6.1A9.97 9.97 0 0112 5c7 0 11 7 11 7s-1.73 3.08-4.5 5.01M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-1">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg text-black border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                  }
                  className="absolute right-3 top-10 cursor-pointer text-slate-500 hover:text-slate-700"
                >
                  {showConfirmPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-7 0-11-7-11-7a17.9 17.9 0 013.832-4.98M6.1 6.1A9.97 9.97 0 0112 5c7 0 11 7 11 7s-1.73 3.08-4.5 5.01M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <circle cx="12" cy="12" r="3" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerMutation.isPending ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>

              <div className="mt-4 text-center">
                <p className="text-slate-600 text-sm">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}