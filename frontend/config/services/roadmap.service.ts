import api from "../instance/api";
import { Roadmap, ApiResponse } from "./cv.service";

export interface SavedRoadmap {
  _id: string;
  userId: string;
  jobTitle: string;
  roadmap: Roadmap;
  description?: string;
  isActive: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SaveRoadmapPayload {
  jobTitle: string;
  roadmap: Roadmap;
  description?: string;
  tags?: string[];
}

export const saveRoadmap = async (
  payload: SaveRoadmapPayload
): Promise<ApiResponse<SavedRoadmap>> => {
  const response = await api.post<ApiResponse<SavedRoadmap>>(
    "/roadmaps/save",
    payload
  );
  return response.data;
};

export const getRoadmaps = async (): Promise<ApiResponse<SavedRoadmap[]>> => {
  const response = await api.get<ApiResponse<SavedRoadmap[]>>("/roadmaps");
  return response.data;
};

export const getRoadmapById = async (
  roadmapId: string
): Promise<ApiResponse<SavedRoadmap>> => {
  const response = await api.get<ApiResponse<SavedRoadmap>>(
    `/roadmaps/${roadmapId}`
  );
  return response.data;
};

export const deleteRoadmap = async (
  roadmapId: string
): Promise<ApiResponse<null>> => {
  const response = await api.delete<ApiResponse<null>>(
    `/roadmaps/${roadmapId}`
  );
  return response.data;
};
