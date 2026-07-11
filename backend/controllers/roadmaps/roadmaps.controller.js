import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { Roadmap } from "../../models/roadmap.schema.js";

// Save a new roadmap
export const saveRoadmap = asyncHandler(async (req, res) => {
  const { jobTitle, roadmap, tags, extractedSkills, missingSkills } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  if (!jobTitle || !roadmap) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Job title and roadmap are required"));
  }

  // Validate roadmap structure
  if (!roadmap.career_goal || !Array.isArray(roadmap.steps)) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Roadmap must contain career_goal (string) and steps (array)",
        ),
      );
  }

  // Validate steps array
  const validSteps = roadmap.steps.every((step) => {
    return (
      step.month !== undefined &&
      step.month !== null &&
      step.title &&
      typeof step.month === "number" &&
      typeof step.title === "string"
    );
  });

  if (!validSteps) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          null,
          "Each step must have a month (number) and title (string)",
        ),
      );
  }

  const newRoadmap = await Roadmap.create({
    userId,
    jobTitle,
    roadmap: {
      career_goal: roadmap.career_goal,
      steps: roadmap.steps,
    },
    tags: tags || [],
    extractedSkills: extractedSkills || [],
    missingSkills: missingSkills || [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, newRoadmap, "Roadmap saved successfully"));
});

// Get all roadmaps for a user
export const getRoadmaps = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  const roadmaps = await Roadmap.find({ userId }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, roadmaps, "Roadmaps retrieved successfully"));
});

// Get a specific roadmap by ID
export const getRoadmapById = asyncHandler(async (req, res) => {
  const { roadmapId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  const roadmap = await Roadmap.findById(roadmapId);

  if (!roadmap) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Roadmap not found"));
  }

  if (roadmap.userId.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(
        new ApiResponse(403, null, "You don't have access to this roadmap"),
      );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, roadmap, "Roadmap retrieved successfully"));
});

// Toggle completion of a single roadmap step (UC-06 / R1.10)
// PATCH /api/v1/roadmaps/:roadmapId/progress   body: { stepIndex, completed }
export const updateRoadmapProgress = asyncHandler(async (req, res) => {
  const { roadmapId } = req.params;
  const { stepIndex, completed } = req.body;
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  const idx = Number(stepIndex);
  if (!Number.isInteger(idx) || idx < 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "stepIndex must be a non-negative integer"));
  }

  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) {
    return res.status(404).json(new ApiResponse(404, null, "Roadmap not found"));
  }
  if (roadmap.userId.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(new ApiResponse(403, null, "You don't have access to this roadmap"));
  }

  const totalSteps = roadmap.roadmap?.steps?.length || 0;
  if (idx >= totalSteps) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "stepIndex is out of range for this roadmap"));
  }

  // Atomic set membership: add on complete, remove on un-complete (idempotent either way).
  const update = completed
    ? { $addToSet: { completedSteps: idx } }
    : { $pull: { completedSteps: idx } };

  const updated = await Roadmap.findByIdAndUpdate(roadmapId, update, { new: true });

  const completedCount = updated.completedSteps.length;
  const percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: updated._id,
        completedSteps: updated.completedSteps,
        totalSteps,
        completedCount,
        percentage,
      },
      "Progress updated"
    )
  );
});

// Delete a roadmap
export const deleteRoadmap = asyncHandler(async (req, res) => {
  const { roadmapId } = req.params;
  const userId = req.user?._id;

  if (!userId) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "User not authenticated"));
  }

  const roadmap = await Roadmap.findById(roadmapId);

  if (!roadmap) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Roadmap not found"));
  }

  if (roadmap.userId.toString() !== userId.toString()) {
    return res
      .status(403)
      .json(
        new ApiResponse(403, null, "You don't have access to this roadmap"),
      );
  }

  await Roadmap.findByIdAndDelete(roadmapId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Roadmap deleted successfully"));
});
