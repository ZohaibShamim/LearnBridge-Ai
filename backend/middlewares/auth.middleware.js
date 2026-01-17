import { User } from "../models/user.model.js";
import { ApiError } from "../utils/appiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyUser = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "No token provided");
  }

  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  
  // decodedToken.role is set to "doctor" when we were signing the jwt so we can decode the token and get the role
  // out of it

  if (decodedToken?.role !== "student" && decodedToken?.role !== "teacher") {
    throw new ApiError(403, "Access Denied: Role is not Student or Teacher");
  }

  // finding doctor in the db if not found jusst return not found

  const user = await User.findById(decodedToken?._id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "User record no longer exists");
  }

  req.user = user;
  next();
});