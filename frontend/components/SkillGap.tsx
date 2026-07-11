// Shared "Skills You Have / Skills to Gain" panel (R1.6 extraction, R1.7 gap).
// Green = skills present in the CV; amber = skills the target role still needs.
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
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {/* Skills you have */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900">Skills You Have <span className="text-slate-400 font-medium">({have.length})</span></h3>
        </div>
        {have.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {have.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full border border-green-100">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No skills detected from your CV.</p>
        )}
      </div>

      {/* Skills to gain */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-900">Skills to Gain <span className="text-slate-400 font-medium">({gap.length})</span></h3>
        </div>
        {gap.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {gap.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 text-sm font-medium rounded-full border border-amber-100">{s}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-600 font-medium">You're all caught up for this role. 🎉</p>
        )}
      </div>
    </div>
  );
}
