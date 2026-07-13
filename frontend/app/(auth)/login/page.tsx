"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Brain, Eye, EyeOff, ShieldCheck } from "lucide-react";
import {
  loginUserStep1,
  verifyOTPAndLogin,
  resendOtp,
} from "@/config/services/auth.service";
import { useAuthStore } from "@/store/auth";
import {
  Button,
  Card,
  Modal,
  ModalIcon,
  ModalTitle,
  toast,
} from "@/components/ui";

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
          className="w-12 h-14 text-center text-xl font-semibold border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition text-slate-900"
        />
      ))}
    </div>
  );
}

// OTP Dialog — built on the shared Modal primitive (focus-trap / esc via Radix)
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
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Modal open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <div className="p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <ModalIcon tone="brand">
            <ShieldCheck className="h-7 w-7" />
          </ModalIcon>
          <ModalTitle className="mt-4 text-2xl font-bold text-slate-900">
            Verification Required
          </ModalTitle>
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
            <span className={`font-mono font-semibold ${timeLeft < 30 ? "text-red-500" : "text-slate-900"}`}>
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
          <Button
            type="button"
            onClick={onVerify}
            disabled={otpCode.length !== 6}
            loading={isVerifying}
            className="w-full"
          >
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
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
      toast.error("OTP expired. Please request a new one.");
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
      toast.success(response.message || "OTP sent to your email!");
      setSessionToken(response.data.sessionToken);
      setOtpDialogOpen(true);
      setTimer(180);
      setOtpCode("");
    },
    onError: (error: any) => {
      console.log("[Login Error]", error);
      const errorMessage = error?.response?.data?.message || "Login failed. Please try again.";
      toast.error(errorMessage);
    },
  });

  // Login Step 2: Verify OTP
  const verifyOTPMutation = useMutation({
    mutationFn: verifyOTPAndLogin,
    onSuccess: (response) => {
      console.log("[OTP Verify Success]", response);
      toast.success(response.message || "Login successful!");
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
      toast.error(errorMessage);
      setOtpCode("");
    },
  });

  // Resend OTP
  const resendOTPMutation = useMutation({
    mutationFn: resendOtp,
    onSuccess: (response) => {
      toast.success(response.message || "OTP resent successfully!");
      setTimer(180);
      setOtpCode("");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Failed to resend OTP.";
      toast.error(errorMessage);
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
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }
    if (!sessionToken) {
      toast.error("Session expired. Please login again.");
      setOtpDialogOpen(false);
      return;
    }
    verifyOTPMutation.mutate({ otp: otpCode, sessionToken });
  };

  const handleResendOtp = () => {
    if (!sessionToken) {
      toast.error("Session expired. Please login again.");
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
      <div className="app-bg min-h-dvh flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand mark */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl brand-gradient shadow-lg shadow-blue-500/25">
                <Brain className="h-6 w-6 text-white" />
              </span>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                LearnBridge <span className="text-blue-600">AI</span>
              </span>
            </div>
            <p className="mt-4 text-slate-600">Sign in to continue</p>
          </div>

          {/* Login Card */}
          <Card className="p-8">
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
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
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
                    placeholder={showPassword ? "password" : "••••••••"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                loading={loginMutation.isPending}
                className="w-full"
              >
                {loginMutation.isPending ? "Sending OTP..." : "Sign In"}
              </Button>
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
          </Card>
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
