import api from "../instance/api";
import { ApiResponse } from "./cv.service";

// Contract matches the backend exactly. Selections and the answer key are INDEX-based
// (0..3); the client never receives correctIndex/explanation until after submitting.

export type Difficulty = "easy" | "medium" | "hard";
export type QuizDifficulty = Difficulty | "mixed";

// A question as sent to the client for taking — NO correct answer.
export interface SafeQuizQuestion {
  question: string;
  options: string[];
  difficulty?: Difficulty;
}

export interface Quiz {
  _id: string;
  userId: string;
  roadmapId?: string;
  title: string;
  description?: string;
  category?: string;
  topic: string;
  difficulty: QuizDifficulty;
  estimatedTime: number; // minutes
  totalQuestions: number;
  questions: SafeQuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerateQuizPayload {
  topic: string;
  difficulty?: QuizDifficulty;
  numQuestions?: number;
  roadmapId?: string;
  title?: string;
  category?: string;
}

export interface SubmitResult {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
  passed?: boolean;
  badgeAwarded?: boolean;
  progress?: number | null; // roadmap % after this submission (subtopic quizzes only)
}

// A question in the results review — includes the correct answer + explanation.
export interface ReviewQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  difficulty?: Difficulty;
}

export interface AttemptAnswer {
  questionIndex: number;
  selectedIndex: number; // -1 = unanswered
  isCorrect: boolean;
}

export interface AttemptResult {
  _id: string;
  quizId: string;
  userId: string;
  answers: AttemptAnswer[];
  score: number;
  total: number;
  percentage: number;
  grade: string;
  passed?: boolean;
  badgeAwarded?: boolean;
  difficulty?: QuizDifficulty;
  timeSpent: number;
  feedback?: string;
  createdAt: string;
  quiz: {
    _id: string;
    title: string;
    topic: string;
    difficulty: QuizDifficulty;
    estimatedTime: number;
    totalQuestions: number;
    questions: ReviewQuestion[];
  };
}

// --- methods -------------------------------------------------------------

export const generateQuiz = async (
  payload: GenerateQuizPayload
): Promise<ApiResponse<Quiz>> => {
  const response = await api.post<ApiResponse<Quiz>>("/quizzes/generate", payload);
  return response.data;
};

export interface SubtopicQuizPayload {
  roadmapId: string;
  stepIndex: number;
  subtopicId: string;
  difficulty: Difficulty;
  numQuestions?: number; // 3..15, defaults to 5 on the backend
}

// Lazily gets (or generates + caches) the quiz for one roadmap subtopic at a fixed difficulty.
export const getOrCreateSubtopicQuiz = async (
  payload: SubtopicQuizPayload
): Promise<ApiResponse<Quiz>> => {
  const response = await api.post<ApiResponse<Quiz>>("/quizzes/subtopic", payload);
  return response.data;
};

export interface TopicQuizPayload {
  roadmapId: string;
  stepIndex: number;
  difficulty: Difficulty;
  numQuestions?: number; // 10..15, defaults to 10 on the backend
}

// A comprehensive quiz spanning ALL subtopics of one topic. Passing it at medium/hard
// clears the whole topic and unlocks the next one.
export const getOrCreateTopicQuiz = async (
  payload: TopicQuizPayload
): Promise<ApiResponse<Quiz>> => {
  const response = await api.post<ApiResponse<Quiz>>("/quizzes/topic", payload);
  return response.data;
};

export const getAllQuizzes = async (): Promise<ApiResponse<Quiz[]>> => {
  const response = await api.get<ApiResponse<Quiz[]>>("/quizzes");
  return response.data;
};

export const getQuizById = async (quizId: string): Promise<ApiResponse<Quiz>> => {
  const response = await api.get<ApiResponse<Quiz>>(`/quizzes/${quizId}`);
  return response.data;
};

export const submitQuiz = async (
  quizId: string,
  answers: number[],
  timeSpent: number
): Promise<ApiResponse<SubmitResult>> => {
  const response = await api.post<ApiResponse<SubmitResult>>(
    `/quizzes/${quizId}/submit`,
    { answers, timeSpent }
  );
  return response.data;
};

export const getAttempt = async (
  attemptId: string
): Promise<ApiResponse<AttemptResult>> => {
  const response = await api.get<ApiResponse<AttemptResult>>(
    `/quizzes/attempt/${attemptId}`
  );
  return response.data;
};
