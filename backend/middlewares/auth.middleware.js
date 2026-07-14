import { User } from "../models/user.model.js";
import { ApiError } from "../utils/appiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyUser = asyncHandler(async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "No token provided");
  }

  // jwt.verify throws TokenExpiredError/JsonWebTokenError on an expired or malformed token.
  // Surface it as a 401 (not a 500) so the client's refresh-on-401 interceptor can recover
  // the session transparently instead of the raw "jwt expired" error breaking the action.
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired access token");
  }

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