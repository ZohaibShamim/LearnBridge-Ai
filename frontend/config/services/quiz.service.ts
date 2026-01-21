import api from "../instance/api";

// Interfaces

export interface QuizQuestion {
  _id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface Quiz {
  _id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  totalQuestions: number;
  estimatedTime: number; // in minutes
  thumbnail?: string;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  _id: string;
  userId: string;
  quizId: string;
  startedAt: string;
  completedAt?: string;
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
  }>;
  score: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
}

export interface QuizResult {
  quiz: Quiz;
  attempt: QuizAttempt;
  percentage: number;
  grade: string;
  feedback: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

// Methods

export const getAllQuizzes = async (): Promise<ApiResponse<Quiz[]>> => {
  const response = await api.get<ApiResponse<Quiz[]>>("/quizzes");
  return response.data;
};

export const getQuizById = async (quizId: string): Promise<ApiResponse<Quiz>> => {
  const response = await api.get<ApiResponse<Quiz>>(`/quizzes/${quizId}`);
  return response.data;
};

export const startQuizAttempt = async (quizId: string): Promise<ApiResponse<QuizAttempt>> => {
  const response = await api.post<ApiResponse<QuizAttempt>>(`/quizzes/${quizId}/attempt`, {});
  return response.data;
};

export const submitQuizAnswer = async (
  attemptId: string,
  questionId: string,
  selectedAnswer: number
): Promise<ApiResponse<QuizAttempt>> => {
  const response = await api.post<ApiResponse<QuizAttempt>>(
    `/quizzes/attempt/${attemptId}/answer`,
    { questionId, selectedAnswer }
  );
  return response.data;
};

export const completeQuizAttempt = async (attemptId: string): Promise<ApiResponse<QuizResult>> => {
  const response = await api.post<ApiResponse<QuizResult>>(
    `/quizzes/attempt/${attemptId}/complete`,
    {}
  );
  return response.data;
};

export const getUserQuizAttempts = async (quizId?: string): Promise<ApiResponse<QuizAttempt[]>> => {
  const url = quizId ? `/quizzes/attempts?quizId=${quizId}` : `/quizzes/attempts`;
  const response = await api.get<ApiResponse<QuizAttempt[]>>(url);
  return response.data;
};
