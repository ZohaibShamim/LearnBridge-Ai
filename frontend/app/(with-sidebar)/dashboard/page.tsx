"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";
import { clearAuthData } from "@/config/token/token";
import {
  BookOpen,
  Brain,
  FileText,
  Target,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleLogout = () => {
    clearAuthData();
    logout();
    router.push("/login");
  };

  const stats = [
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Courses in Progress",
      value: "4",
      subtitle: "2 near completion",
      color: "bg-blue-100 text-blue-600",
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Quizzes Completed",
      value: "23",
      subtitle: "85% avg score",
      color: "bg-green-100 text-green-600",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Learning Hours",
      value: "48",
      subtitle: "This month",
      color: "bg-purple-100 text-purple-600",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Overall Progress",
      value: "67%",
      subtitle: "Keep going!",
      color: "bg-orange-100 text-orange-600",
    },
  ];

  const currentLearning = [
    {
      id: 1,
      title: "Machine Learning Fundamentals",
      progress: 75,
      status: "In Progress",
      image: "/images/machine-learning.jpg",
      daysLeft: 5,
    },
    {
      id: 2,
      title: "Python for Data Science",
      progress: 90,
      status: "Almost Done",
      image: "/images/data-science.jpg",
      daysLeft: 2,
    },
    {
      id: 3,
      title: "Deep Learning Basics",
      progress: 30,
      status: "In Progress",
      image: "/images/ai-learning.jpg",
      daysLeft: 10,
    },
  ];

  const recentActivity = [
    {
      id: 1,
      title: "Completed Quiz: Neural Networks",
      time: "2 hours ago",
      score: "92%",
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    },
    {
      id: 2,
      title: "Resume Analyzed",
      time: "Yesterday",
      score: "5 skill gaps",
      icon: <FileText className="h-5 w-5 text-blue-600" />,
    },
    {
      id: 3,
      title: "Completed Module: Data Preprocessing",
      time: "2 days ago",
      score: "100%",
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    },
  ];

  const recommendedCourses = [
    {
      id: 1,
      title: "Advanced AI Concepts",
      category: "Artificial Intelligence",
      difficulty: "Hard",
      image: "/images/ai-learning.jpg",
      recommended: true,
    },
    {
      id: 2,
      title: "Web Development Masterclass",
      category: "Frontend",
      difficulty: "Medium",
      image: "/images/machine-learning.jpg",
      recommended: false,
    },
    {
      id: 3,
      title: "Database Design Patterns",
      category: "Backend",
      difficulty: "Hard",
      image: "/images/data-science.jpg",
      recommended: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-8">
      {/* Header */}
      {/* <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              LearnBridge AI
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/upload")}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              Upload CV
            </button>
            {user && (
              <span className="text-sm text-slate-600 hidden md:block font-medium">
                {user.firstName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg text-slate-600 hover:text-white hover:bg-red-500 text-sm font-medium transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header> */}

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 lg:px-8 py-12">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-white max-w-lg">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, {user?.firstName || "Learner"}! 👋
              </h2>
              <p className="text-blue-100 text-lg">
                You're making great progress. Continue your learning journey and unlock your potential.
              </p>
            </div>
            <div className="hidden md:block relative h-32 w-48 overflow-hidden rounded-2xl shadow-xl">
              <Image
                src="/images/ai-learning.jpg"
                alt="Learning illustration"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center mb-4`}>
                {stat.icon}
              </div>
              <p className="text-slate-600 text-sm font-medium mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
              <p className="text-xs text-slate-500">{stat.subtitle}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3 mb-10">
          {/* Current Learning Path */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Current Learning Path</h3>
              </div>
              <div className="space-y-4">
                {currentLearning.map((item) => (
                  <div
                    key={item.id}
                    className="group p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all cursor-pointer"
                    onClick={() => setSelectedPath(item.id.toString())}
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{item.title}</h4>
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            {item.status}
                          </span>
                        </div>
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600">{item.progress}% Complete</span>
                            <span className="text-xs text-slate-500">{item.daysLeft} days left</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 mt-1">{activity.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                  <div className="ml-8">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                      {activity.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommended Courses */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Recommended for You</h3>
            </div>
            <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">View All</button>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {recommendedCourses.map((course) => (
              <div
                key={course.id}
                className="rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="relative h-32 overflow-hidden bg-slate-200">
                  <Image
                    src={course.image}
                    alt={course.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                  {course.recommended && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                      Recommended
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900 mb-1 line-clamp-2">{course.title}</h4>
                  <p className="text-xs text-slate-600 mb-3">{course.category}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      course.difficulty === "Hard"
                        ? "bg-red-100 text-red-700"
                        : course.difficulty === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {course.difficulty}
                    </span>
                    <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      Enroll →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}