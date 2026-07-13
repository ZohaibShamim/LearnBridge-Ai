"use client";

import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";
import { Button, Card, toast } from "@/components/ui";
import { useAuthStore } from "@/store/auth";

// Stub: no backend wiring exists for profile updates yet — this seeds from the
// real signed-in user and fakes the save with a toast. Do NOT add an API call
// here until a backend endpoint exists.
export default function AccountSettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed from zustand once the persisted user rehydrates (may be null first paint).
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
  }, [user]);

  const initial =
    firstName.charAt(0).toUpperCase() ||
    email.charAt(0).toUpperCase() ||
    "U";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // ponytail: no API — brief fake latency so the loading state is honest UI.
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile saved");
    }, 700);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Account settings</h1>
        <p className="mt-1 text-slate-600">
          Manage your personal information and how it appears across LearnBridge.
        </p>
      </header>

      <Card className="p-6 sm:p-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar — matches the sidebar's gradient initial chip */}
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-sm"
            >
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-slate-900">
                {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Your profile"}
              </p>
              <p className="truncate text-sm text-slate-500">{email || "No email on file"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="mb-1.5 block text-sm font-medium text-slate-700">
                First name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="mb-1.5 block text-sm font-medium text-slate-700">
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <UserIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-6">
            <Button type="submit" loading={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
