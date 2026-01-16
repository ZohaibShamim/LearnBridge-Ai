import { Router } from "express";
import { loginUserStep1, registerUser } from "../controllers/user/user.controller.js";

const router = Router();

router.post("/register", registerUser)
router.post("/login", loginUserStep1)

export default router;