import { Router } from "express";
import {
  loginUserStep1,
  registerUser,
  uploadCv,
  verifyOTPAndLogin,
} from "../controllers/user/user.controller.js";
import { upload } from "../middlewares/multer.middlware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUserStep1);
router.post("/verify-otp", verifyOTPAndLogin);
router.post("/upload-cv", upload.single("cv"), verifyUser, uploadCv);

export default router;
