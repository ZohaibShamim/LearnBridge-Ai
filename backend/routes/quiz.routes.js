import { Router } from "express";
import {
  generateQuiz,
  getOrCreateSubtopicQuiz,
  getQuizzes,
  getQuizById,
  submitQuiz,
  getAttempt,
  getUserAttempts,
} from "../controllers/quizzes/quizzes.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

// All quiz routes require authentication.
router.use(verifyUser);

router.post("/generate", generateQuiz);
router.post("/subtopic", getOrCreateSubtopicQuiz);

// Specific/literal paths must be declared before the ":quizId" param route,
// otherwise "/attempts" would be captured as a quizId.
router.get("/attempts", getUserAttempts);
router.get("/attempt/:attemptId", getAttempt);

router.get("/", getQuizzes);
router.get("/:quizId", getQuizById);
router.post("/:quizId/submit", submitQuiz);

export default router;
