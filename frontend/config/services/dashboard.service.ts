import api from "../instance/api";
import { ApiResponse } from "./cv.service";

export interface DashboardStats {
  coursesInProgress: number;
  roadmapsCompleted: number;
  quizzesCompleted: number;
  avgQuizScore: number;
  overallProgress: number;
  totalRoadmaps: number;
}

export interface DashboardRoadmap {
  _id: string;
  jobTitle: string;
  careerGoal: string;
  totalSteps: number;
  completedCount: number;
  progress: number;
  tags: string[];
}

export interface DashboardActivity {
  type: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  date: string;
}

export interface DashboardData {
  stats: DashboardStats;
  currentLearning: DashboardRoadmap[];
  recentActivity: DashboardActivity[];
}

export const getDashboard = async (): Promise<ApiResponse<DashboardData>> => {
  const response = await api.get<ApiResponse<DashboardData>>("/dashboard");
  return response.data;
};
