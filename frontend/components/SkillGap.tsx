// Shared "Skills You Have / Skills to Gain" panel (R1.6 extraction, R1.7 gap).
// Green = skills present in the CV; amber = skills the target role still needs.
import { CheckCircle2, Zap } from "lucide-react";
import { Card, CardHeader, IconChip, Badge } from "@/components/ui";

export function SkillGapSection({
  extractedSkills,
  missingSkills,
}: {
  extractedSkills?: string[];
  missingSkills?: string[];
}) {
  const have = extractedSkills || [];
  const gap = missingSkills || [];

  if (have.length === 0 && gap.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-8">
      {/* Skills you have */}
      <Card className="p-6">
        <CardHeader className="mb-4 gap-2.5">
          <IconChip className="h-9 w-9 rounded-lg bg-green-100 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
          </IconChip>
          <h3 className="font-bold text-slate-900">
            Skills You Have{" "}
            <span className="font-medium text-slate-400">({have.length})</span>
          </h3>
        </CardHeader>
        {have.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {have.map((s, i) => (
              <Badge key={i} tone="success">
                {s}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No skills detected from your CV.</p>
        )}
      </Card>

      {/* Skills to gain */}
      <Card className="p-6">
        <CardHeader className="mb-4 gap-2.5">
          <IconChip className="h-9 w-9 rounded-lg bg-amber-100 text-amber-600">
            <Zap className="h-5 w-5" />
          </IconChip>
          <h3 className="font-bold text-slate-900">
            Skills to Gain{" "}
            <span className="font-medium text-slate-400">({gap.length})</span>
          </h3>
        </CardHeader>
        {gap.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {gap.map((s, i) => (
              <Badge key={i} tone="warning">
                {s}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-green-600">
            You&apos;re all caught up for this role. 🎉
          </p>
        )}
      </Card>
    </div>
  );
}
