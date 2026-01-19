import api from "../instance/api";
import {
  setAccessToken,
  removeAccessToken,
  clearAuthData,
} from "../token/token";

// Interfaces

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  institution: string;
  degree: string;
}

export interface UserResponse {
  _id: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  firstName: string;
  lastName: string;
  institution: string;
  degree: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  sessionToken: string;
  message: string;
}

export interface VerifyOTPData {
  otp: string;
  sessionToken: string;
}

export interface VerifyOTPResponse {
  user: UserResponse;
  accessToken: string;
  message: string;
}


// Methods

export const registerUser = async (
  data: RegisterData,
): Promise<ApiResponse<{ user: UserResponse }>> => {
  const response = await api.post<ApiResponse<{ user: UserResponse }>>(
    "/users/register",
    data,
  );
  return response.data;
};

export const loginUserStep1 = async (
  data: LoginData
): Promise<ApiResponse<LoginResponse>> => {
  const response = await api.post<ApiResponse<LoginResponse>>(
    '/users/login',
    data
  );
  
  return response.data;
};

export const verifyOTPAndLogin = async (
  data: VerifyOTPData
): Promise<ApiResponse<VerifyOTPResponse>> => {
  const response = await api.post<ApiResponse<VerifyOTPResponse>>(
    '/users/verify-otp',
    data,
    {
      withCredentials: true, // Critical: Allow cookie setting
    }
  );

  // Store ONLY the access token in memory
  // Refresh token is automatically set as HTTP-only cookie by backend
  if (response.data.data.accessToken) {
    setAccessToken(response.data.data.accessToken);
  }

  return response.data;
};