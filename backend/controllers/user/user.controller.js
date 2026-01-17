import { asyncHandler } from "../../utils/asyncHandler.js";
import { Profile } from "../../models/profile.model.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/appiError.js";
import mongoose from "mongoose";
import { hashPassword, decodePassword } from "../../utils/password.js";
import { ApiResponse } from "../../utils/apiResponse.js";
import { otpEmail } from "../../utils/emails.js";
import jwt from "jsonwebtoken";
import { Job } from "../../models/jobs.schema.js";
import cvQueue from "../../queues/cv.queue.js";
import { uploadCvOnCloudinary } from "../../utils/cloudinary.js";
import bcrypt from "bcrypt";

// register user

export const registerUser = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, degree, institute } = req.body;

  if (
    [email, password, firstName, lastName, degree, institute].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // this transaction means that now once both schemas User and Profile are created successfully
  // only then the transaction will commit and the data will store otherwise it will just abort the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingUser = await User.findOne({ email }).session(session);
    if (existingUser) {
      throw new ApiError(409, "User with this email already exists");
    }

    const hashedPassword = await hashPassword(password);

    const userArray = await User.create(
      [
        {
          email,
          password: hashedPassword,
          status: "pending",
        },
      ],
      { session }
    );

    const newUser = userArray[0];

    await Profile.create(
      [
        {
          user: newUser._id,
          firstName,
          lastName,
          education: [{ degree, institution: institute }],
        },
      ],
      { session }
    );

    // if both models are created successfully then commit the transaction
    await session.commitTransaction();

    const createdUser = await User.findById(newUser._id);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { user: createdUser },
          "User registered successfully"
        )
      );
  } catch (error) {
    // if anything goes wrong do not save anything simply abort the session
    await session.abortTransaction();

    if (error instanceof ApiError) throw error;
    throw new ApiError(
      500,
      error?.message || "Internal Server Error during registration"
    );
  } finally {
    session.endSession();
  }
});

// login user - step 1: verify email and password, send otp

export const loginUserStep1 = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt for email:", email);

  const user = await User.findOne({ email });

  console.log("User found:", user);

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  const isPasswordValid = await decodePassword(user.password, password);
  if (!isPasswordValid) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Invalid credentials"));
  }

  // create random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otp_expiry = Date.now() + 3 * 60 * 1000; // 3 minutes
  await user.save({ validateBeforeSave: false });

  await otpEmail(otp, user.email);

  // temporary session token for OTP verification
  const sessionToken = jwt.sign(
    { _id: user._id },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "10m" }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { sessionToken },
        "OTP sent. Please verify using the session token."
      )
    );
});

// verify the otp sent to email and login the user

export const verifyOTPAndLogin = asyncHandler(async (req, res) => {
  // session token which we have saved in the previous step to get the user

  const { otp, sessionToken } = req.body;

  if (!otp || !sessionToken) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "OTP and Session Token are required"));
  }

  const decodedToken = jwt.verify(
    sessionToken,
    process.env.ACCESS_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken._id);

  if (!user || user.otp !== otp || user.otp_expiry < Date.now()) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Invalid or expired OTP"));
  }

  user.otp = undefined;
  user.otp_expiry = undefined;

  const accessToken = user.generateAccessToken();
  const rawRefreshToken = user.generateRefreshToken();

  user.refreshToken = await bcrypt.hash(rawRefreshToken, 10);
  await user.save({ validateBeforeSave: false });

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("refreshToken", rawRefreshToken, options)
    .json(
      new ApiResponse(200, { user, accessToken }, "User logged in successfully")
    );
});

// upload cv and create a job for processing

export const uploadCv = asyncHandler(async (req, res) => {
  const localImagePath = req.file.path;
  const uploadResult = await uploadCvOnCloudinary(localImagePath);

  const cvUrl = uploadResult?.secure_url || uploadResult?.url || String(uploadResult);

  const job = await Job.create({
    userId: req.user._id,
    cvUrl,
  });

  await cvQueue.add("process-cv", {
    jobId: job._id.toString(),
    cvUrl,
  });

  res.status(202).json({
    message: "CV uploaded, processing started",
    jobId: job._id,
  });
});

// user can create a new access token using refresh token and the previous refresh token will be rotated for security

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken; // we will get the refresh token from the cookies but for testing purpose we can also get it from the body

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  const user = await User.findById(decodedToken?._id);

  if (!user) {
    throw new ApiError(401, "user not found");
  }

  // this is the IMPORTANT part what happening here is if the refresh token send through cookies
  // or the body is not the same as in the database then it means the token is being compromised so we immediately
  // clear all the cookies and the user is being logged out and has to login again to generate new refresh and access token

  const isTokenValid = bcrypt.compare(incomingRefreshToken, user.refreshToken);

  if (!isTokenValid) {
    // (Server-side logout) by removing the refresh token from the database
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });

    // (Client-side logout) by clearning the cookies
    const options = { httpOnly: true, secure: true };

    return res
      .status(403)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(
        new ApiResponse(
          403,
          null,
          "Security Alert: Compromised token detected. All sessions cleared. Please login again."
        )
      );
  }

  const accessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();

  // (REFRESH TOKEN ROTATION)
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  const options = { httpOnly: true, secure: true };

  return res
    .status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .json(new ApiResponse(200, { accessToken }, "Token rotated successfully"));
});