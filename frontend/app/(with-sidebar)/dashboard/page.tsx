"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth";
import { getDashboard } from "@/config/services/dashboard.service";
import {
  BookOpen,
  Target,
  TrendingUp,
  CheckCircle,
  Award,
  ArrowRight,
  Map,
} from "lucide-react";

// Grade -> pill classes (literal strings, never interpolated — DESIGN.md).
const gradePill: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-yellow-100 text-yellow-700",
  D: "bg-orange-100 text-orange-700",
  F: "bg-red-100 text-red-700",
};

function StatTile({
  icon,
  color,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>{icon}</div>
      <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const dash = data?.data;
  const stats = dash?.stats;
  const currentLearning = dash?.currentLearning || [];
  const recentActivity = dash?.recentActivity || [];

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-8">
      <main className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative z-10 text-white max-w-lg">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {user?.firstName || "Learner"}! 👋
            </h2>
            <p className="text-blue-100 text-lg">
              {stats && stats.totalRoadmaps > 0
                ? "Here's how your learning journey is going."
                : "Upload your CV to generate your first roadmap and start tracking progress."}
            </p>
          </div>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-36 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-50 text-red-600 px-6 py-8 rounded-2xl text-center border border-red-100 mb-10">
            Failed to load your dashboard. Please refresh.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            <StatTile
              icon={<BookOpen className="h-6 w-6" />}
              color="bg-blue-100 text-blue-600"
              title="Courses in Progress"
              value={String(stats?.coursesInProgress ?? 0)}
              subtitle={`${stats?.roadmapsCompleted ?? 0} completed`}
            />
            <StatTile
              icon={<Target className="h-6 w-6" />}
              color="bg-green-100 text-green-600"
              title="Quizzes Completed"
              value={String(stats?.quizzesCompleted ?? 0)}
              subtitle={stats?.quizzesCompleted ? `${stats.avgQuizScore}% avg score` : "No quizzes yet"}
            />
            <StatTile
              icon={<TrendingUp className="h-6 w-6" />}
              color="bg-orange-100 text-orange-600"
              title="Overall Progress"
              value={`${stats?.overallProgress ?? 0}%`}
              subtitle={stats && stats.totalRoadmaps > 0 ? "Across all roadmaps" : "Start a roadmap"}
            />
            <StatTile
              icon={<Award className="h-6 w-6" />}
              color="bg-purple-100 text-purple-600"
              title="Roadmaps"
              value={String(stats?.totalRoadmaps ?? 0)}
              subtitle="Saved roadmaps"
            />
          </div>
        )}

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Current learning */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Map className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Current Learning Path</h3>
              </div>

              {currentLearning.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-600 mb-4">No roadmaps yet. Generate one to start tracking progress.</p>
                  <button onClick={() => router.push("/upload")} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/25">
                    Upload CV
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentLearning.map((item) => (
                    <div
                      key={item._id}
                      className="group p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer"
                      onClick={() => router.push(`/roadmaps/${item._id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-slate-900">{item.jobTitle}</h4>
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full ${
                                item.progress === 100
                                  ? "bg-green-100 text-green-700"
                                  : item.progress > 0
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.progress === 100 ? "Completed" : item.progress > 0 ? "In Progress" : "Not Started"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600">{item.progress}% Complete</span>
                            <span className="text-xs text-slate-500">
                              {item.completedCount}/{item.total ?? item.totalSteps} {item.unit || "steps"}
                              {item.badges ? ` · ${item.badges} ⭐` : ""}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${item.progress === 100 ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Recent Quiz Activity</h3>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 text-sm mb-4">No quiz attempts yet.</p>
                <button onClick={() => router.push("/quizzes")} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  Take a quiz →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-900">Quiz completed</p>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${gradePill[a.grade] || gradePill.F}`}>{a.grade}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{formatDate(a.date)}</span>
                      <span className="text-xs font-medium text-slate-700">{a.score}/{a.total} · {a.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
