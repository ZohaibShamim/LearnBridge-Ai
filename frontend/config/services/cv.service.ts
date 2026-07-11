import api from "../instance/api";

// Interfaces

export interface UploadCVResponse {
  message: string;
  jobId: string;
}

// Resource can be either a structured object or just URLs from the API
export interface Resource {
  type?: "youtube" | "article";
  title?: string;
  url: string;
  thumbnail?: string;
}

// Resources from Python API come in this format
export interface StepResources {
  youtube_video?: string | null;
  article?: string | null;
}

export interface RoadmapStep {
  step_number: number;
  title: string;
  description: string;
  duration?: string;
  skills?: string[];
  resources?: Resource[] | StepResources;  // Can be either format
}

export interface Roadmap {
  career_goal: string;
  current_level?: string;
  estimated_timeline?: string;
  steps: RoadmapStep[];
}

export interface JobStatus {
  _id: string;
  userId: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  cvUrl: string;
  role?: string;  // Role selected by user (e.g., "data_scientist", "software_engineer")
  extractedText?: string;
  roadmap?: Roadmap;
  tags?: string[];  // AI-generated tags from roadmap skills
  extractedSkills?: string[];  // skills found in the CV (R1.6)
  requiredSkills?: string[];   // skills the target role needs
  missingSkills?: string[];    // required - extracted (R1.7)
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to convert role format from snake_case to Title Case
export const convertRoleToTitle = (role?: string): string => {
  if (!role) return "Career Roadmap";
  
  const roleMap: Record<string, string> = {
    "data_scientist": "Data Science",
    "software_engineer": "Software Engineering",
    "machine_learning": "Machine Learning Engineering",
    "ai": "AI Engineering",
  };
  
  return roleMap[role] || role.replace(/_/g, " ").split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
};

export interface ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

// Helper function to normalize resources to array format
export const normalizeResources = (resources: Resource[] | StepResources | undefined): Resource[] => {
  if (!resources) return [];
  
  // If it's already an array, return it
  if (Array.isArray(resources)) {
    return resources;
  }
  
  // If it's the StepResources format from Python API
  const normalized: Resource[] = [];
  
  if (resources.youtube_video) {
    normalized.push({
      type: "youtube",
      title: "Watch Tutorial",
      url: resources.youtube_video,
    });
  }
  
  if (resources.article) {
    normalized.push({
      type: "article",
      title: "Read Article",
      url: resources.article,
    });
  }
  
  return normalized;
};

// Methods

export const uploadCV = async (file: File, role: string): Promise<ApiResponse<UploadCVResponse>> => {
  const formData = new FormData();
  formData.append("cv", file);
  formData.append("role", role);

  const response = await api.post<ApiResponse<UploadCVResponse>>(
    "/users/upload-cv",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<ApiResponse<JobStatus>> => {
  const response = await api.get<ApiResponse<JobStatus>>(`/users/job/${jobId}`);
  return response.data;
};
