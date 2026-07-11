import { Router } from "express";
import {
  getJobStatus,
  loginUserStep1,
  refreshAccessToken,
  registerUser,
  resendOtp,
  uploadCv,
  verifyOTPAndLogin,
} from "../controllers/user/user.controller.js";
import { upload } from "../middlewares/multer.middlware.js";
import { verifyUser } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUserStep1);
router.post("/verify-otp", verifyOTPAndLogin);
router.post("/resend-otp", resendOtp);
// verifyUser BEFORE multer so an unauthenticated request never writes a file to disk.
router.post("/upload-cv", verifyUser, upload.single("cv"), uploadCv);
router.get("/job/:jobId", verifyUser, getJobStatus);
router.post("/refresh-token", refreshAccessToken);

export default router;
