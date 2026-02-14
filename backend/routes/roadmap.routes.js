import { Router } from "express";
import {
  saveRoadmap,
  getRoadmaps,
  getRoadmapById,
  deleteRoadmap,
} from "../controllers/roadmaps/roadmaps.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes with authentication
router.use(verifyUser);

// Save a new roadmap
router.post("/save", saveRoadmap);

// Get all roadmaps for the authenticated user
router.get("/", getRoadmaps);

// Get a specific roadmap by ID
router.get("/:roadmapId", getRoadmapById);

// Delete a roadmap
router.delete("/:roadmapId", deleteRoadmap);

export default router;
