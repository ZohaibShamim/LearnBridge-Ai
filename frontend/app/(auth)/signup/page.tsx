"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Brain, Eye, EyeOff } from "lucide-react";
import { registerUser } from "@/config/services/auth.service";
import { Button, Card, toast } from "@/components/ui";

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (response) => {
      console.log("[Register Success]", response);
      toast.success(response.message || "Account created successfully!");

      // Redirect to login after successful registration
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    },
    onError: (error: any) => {
      console.log("[Register Error]", error);
      const errorMessage = error?.response?.data?.message || "Registration failed. Please try again.";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
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
    <div className="app-bg min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl brand-gradient shadow-lg shadow-blue-500/25">
              <Brain className="h-6 w-6 text-white" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              LearnBridge <span className="text-blue-600">AI</span>
            </span>
          </div>
          <p className="mt-4 text-slate-600">Create your account</p>
        </div>

        <Card className="p-8">
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
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
                className={inputClass}
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
                className={`${inputClass} pr-12`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-10 cursor-pointer text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
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
                className={`${inputClass} pr-12`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
                className="absolute right-3 top-10 cursor-pointer text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              loading={registerMutation.isPending}
              className="w-full"
            >
              {registerMutation.isPending ? "Creating account..." : "Create Account"}
            </Button>

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
        </Card>
      </div>
    </div>
  );
}
