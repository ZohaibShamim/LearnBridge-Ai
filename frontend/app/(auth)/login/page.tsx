"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import {
  loginUserStep1,
  verifyOTPAndLogin,
  resendOtp,
} from "@/config/services/auth.service";
import { useAuthStore } from "@/store/auth";

// OTP Input Component
function OTPInput({
  length = 6,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return; // Only allow digits

    const newValue = value.split("");
    newValue[index] = char;
    const result = newValue.join("").slice(0, length);
    onChange(result);

    // Move to next input
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pastedData);
    if (pastedData.length > 0) {
      inputRefs.current[Math.min(pastedData.length, length - 1)]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-semibold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-black"
        />
      ))}
    </div>
  );
}

// OTP Dialog Component
function OTPDialog({
  isOpen,
  onClose,
  email,
  timeLeft,
  otpCode,
  setOtpCode,
  onVerify,
  onResend,
  isVerifying,
  isResending,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  timeLeft: number;
  otpCode: string;
  setOtpCode: (val: string) => void;
  onVerify: () => void;
  onResend: () => void;
  isVerifying: boolean;
  isResending: boolean;
}) {
  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Verification Required</h2>
          <p className="text-slate-600 mt-2">
            We&apos;ve sent a 6-digit code to<br />
            <span className="font-medium text-slate-900">{email}</span>
          </p>
        </div>

        {/* OTP Input */}
        <div className="mb-6">
          <OTPInput length={6} value={otpCode} onChange={setOtpCode} />
        </div>

        {/* Timer & Resend */}
        <div className="text-center mb-6">
          <p className="text-sm text-slate-600">
            Code expires in{" "}
            <span className={`font-semibold ${timeLeft < 30 ? "text-red-500" : "text-slate-900"}`}>
              {formatTime(timeLeft)}
            </span>
          </p>
          <button
            type="button"
            onClick={onResend}
            disabled={isResending || timeLeft > 0}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {isResending ? "Sending..." : "Resend code"}
          </button>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onVerify}
            disabled={otpCode.length !== 6 || isVerifying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isVerifying ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-slate-600 hover:text-slate-800 font-medium py-2 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

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

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  const [formData, setFormData] = useState({
    email: "rohansresurrection+99@gmail.com",
    password: "TestPass123!",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // OTP state
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [timer, setTimer] = useState(180);
  const [sessionToken, setSessionToken] = useState("");

  // Timer countdown
  useEffect(() => {
    if (otpDialogOpen && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpDialogOpen, timer]);

  // Timer expiration
  useEffect(() => {
    if (otpDialogOpen && timer === 0) {
      setToast({ message: "OTP expired. Please request a new one.", type: "error" });
      setOtpDialogOpen(false);
      setOtpCode("");
      setSessionToken("");
    }
  }, [timer, otpDialogOpen]);

  // Login Step 1
  const loginMutation = useMutation({
    mutationFn: loginUserStep1,
    onSuccess: (response) => {
      console.log("[Login Success]", response);
      setToast({ message: response.message || "OTP sent to your email!", type: "success" });
      setSessionToken(response.data.sessionToken);
      setOtpDialogOpen(true);
      setTimer(180);
      setOtpCode("");
    },
    onError: (error: any) => {
      console.log("[Login Error]", error);
      const errorMessage = error?.response?.data?.message || "Login failed. Please try again.";
      setToast({ message: errorMessage, type: "error" });
    },
  });

  // Login Step 2: Verify OTP
  const verifyOTPMutation = useMutation({
    mutationFn: verifyOTPAndLogin,
    onSuccess: (response) => {
      console.log("[OTP Verify Success]", response);
      setToast({ message: response.message || "Login successful!", type: "success" });
      setUser(response.data.user);
      setOtpDialogOpen(false);
      setSessionToken("");
      setOtpCode("");

      // Redirect after login - no searchParams
      setTimeout(() => {
        router.push("/upload");
      }, 500);
    },
    onError: (error: any) => {
      console.log("[OTP Verify Error]", error);
      const errorMessage = error?.response?.data?.message || "Invalid OTP. Please try again.";
      setToast({ message: errorMessage, type: "error" });
      setOtpCode("");
    },
  });

  // Resend OTP
  const resendOTPMutation = useMutation({
    mutationFn: resendOtp,
    onSuccess: (response) => {
      setToast({ message: response.message || "OTP resent successfully!", type: "success" });
      setTimer(180);
      setOtpCode("");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to resend OTP.";
      setToast({ message: errorMessage, type: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[Form Submit]", formData);
    loginMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = () => {
    console.log("[Navigate to Signup]");
    router.push("/signup");
  };

  const handleVerifyOtp = () => {
    if (otpCode.length !== 6) {
      setToast({ message: "Please enter a valid 6-digit OTP", type: "error" });
      return;
    }
    if (!sessionToken) {
      setToast({ message: "Session expired. Please login again.", type: "error" });
      setOtpDialogOpen(false);
      return;
    }
    verifyOTPMutation.mutate({ otp: otpCode, sessionToken });
  };

  const handleResendOtp = () => {
    if (!sessionToken) {
      setToast({ message: "Session expired. Please login again.", type: "error" });
      setOtpDialogOpen(false);
      return;
    }
    resendOTPMutation.mutate({ sessionToken });
  };

  const handleCloseOtpDialog = () => {
    setOtpDialogOpen(false);
    setOtpCode("");
    setSessionToken("");
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
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              LearnBridge AI
            </h1>
            <p className="text-slate-600">Sign in to continue</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border text-black border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 pr-12 rounded-lg border text-black border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder={showPassword ? "password" : "••••••••"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginMutation.isPending ? (
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
                    Sending OTP...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Dev demo credentials */}
            <p className="mt-4 text-center text-xs text-slate-400">
              Demo: rohansresurrection+99@gmail.com / TestPass123!
            </p>

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 text-sm">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={handleSignUp}
                  className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Dialog */}
      <OTPDialog
        isOpen={otpDialogOpen}
        onClose={handleCloseOtpDialog}
        email={formData.email}
        timeLeft={timer}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        isVerifying={verifyOTPMutation.isPending}
        isResending={resendOTPMutation.isPending}
      />
    </>
  );
}
