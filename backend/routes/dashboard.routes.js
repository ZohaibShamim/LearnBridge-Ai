import { Router } from "express";
import { getDashboard } from "../controllers/dashboard/dashboard.controller.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyUser);
router.get("/", getDashboard);

export default router;
