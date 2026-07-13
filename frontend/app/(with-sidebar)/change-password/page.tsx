"use client";

import { useState } from "react";
import { Eye, EyeOff, AlertCircle, Check, X, ShieldCheck } from "lucide-react";
import { Button, Card, CardHeader, IconChip, toast } from "@/components/ui";

// Stub: no backend endpoint exists for password change yet. Validation is real
// (client-side match + length), the "update" is faked with a toast. Do NOT add
// an API call here until a backend route exists.
const MIN_LENGTH = 8;

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 py-2.5 pl-4 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="tap absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const longEnough = newPassword.length >= MIN_LENGTH;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!longEnough) {
      setError(`New password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      toast.error("Passwords do not match");
      return;
    }

    setSaving(true);
    // ponytail: no API — brief fake latency so the loading state is honest UI.
    setTimeout(() => {
      setSaving(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated");
    }, 700);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Change password</h1>
        <p className="mt-1 text-slate-600">
          Update the password you use to sign in to LearnBridge.
        </p>
      </header>

      <Card className="p-6 sm:p-8">
        <CardHeader className="mb-6">
          <IconChip>
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </IconChip>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Password</h2>
            <p className="text-sm text-slate-500">Choose a strong, unique password.</p>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <PasswordField
            id="currentPassword"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />

          <div>
            <PasswordField
              id="newPassword"
              label="New password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            {newPassword.length > 0 && (
              <p
                className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                  longEnough ? "text-green-600" : "text-slate-500"
                }`}
              >
                {longEnough ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <X className="h-3.5 w-3.5" aria-hidden />
                )}
                At least {MIN_LENGTH} characters
              </p>
            )}
          </div>

          <div>
            <PasswordField
              id="confirmPassword"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {mismatch && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                Passwords do not match
              </p>
            )}
          </div>

          {/* Inline error block — icon + text, never color alone (DESIGN.md) */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-6">
            <Button type="submit" loading={saving}>
              {saving ? "Updating..." : "Change password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
