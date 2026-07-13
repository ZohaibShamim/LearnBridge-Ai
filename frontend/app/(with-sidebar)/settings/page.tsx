"use client";

import { useState } from "react";
import { Bell, ShieldCheck, Palette } from "lucide-react";
import { Card, CardHeader, IconChip } from "@/components/ui";

// Local-only preferences surface — no backend persists these yet. Toggles are
// purely client state; do NOT wire an API here until an endpoint exists.

/** Accessible pill switch: role=switch + aria-checked, knob slides via transform. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        checked ? "bg-blue-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

type Row = { key: string; label: string; desc: string };
type Section = { title: string; icon: typeof Bell; chip: string; rows: Row[] };

const SECTIONS: Section[] = [
  {
    title: "Notifications",
    icon: Bell,
    chip: "bg-blue-100 text-blue-600",
    rows: [
      { key: "emailNotifications", label: "Email notifications", desc: "Get emailed when a roadmap or quiz finishes generating." },
      { key: "productUpdates", label: "Product updates", desc: "Occasional news about new LearnBridge features." },
      { key: "weeklyDigest", label: "Weekly progress digest", desc: "A Monday summary of what you learned last week." },
    ],
  },
  {
    title: "Privacy",
    icon: ShieldCheck,
    chip: "bg-purple-100 text-purple-600",
    rows: [
      { key: "publicProfile", label: "Public profile", desc: "Let others view your profile and completed roadmaps." },
      { key: "showActivity", label: "Show learning activity", desc: "Display your recent quiz and roadmap activity on your profile." },
      { key: "personalization", label: "Personalized recommendations", desc: "Use your CV and progress to tailor suggested resources." },
    ],
  },
  {
    title: "Appearance",
    icon: Palette,
    chip: "bg-orange-100 text-orange-600",
    rows: [
      { key: "compactMode", label: "Compact mode", desc: "Reduce spacing to fit more on screen." },
      { key: "reducedMotion", label: "Reduced motion", desc: "Minimize animations and transitions across the app." },
    ],
  },
];

const DEFAULTS: Record<string, boolean> = {
  emailNotifications: true,
  productUpdates: false,
  weeklyDigest: true,
  publicProfile: false,
  showActivity: true,
  personalization: true,
  compactMode: false,
  reducedMotion: false,
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULTS);
  const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-600">
          Control notifications, privacy, and how LearnBridge looks and feels.
        </p>
      </header>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="p-6 sm:p-8">
              <CardHeader className="mb-5">
                <IconChip className={section.chip}>
                  <Icon className="h-5 w-5" aria-hidden />
                </IconChip>
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
              </CardHeader>

              <div className="divide-y divide-slate-100">
                {section.rows.map((row) => (
                  <div key={row.key} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{row.label}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{row.desc}</p>
                    </div>
                    <Toggle checked={prefs[row.key]} onChange={() => toggle(row.key)} label={row.label} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
