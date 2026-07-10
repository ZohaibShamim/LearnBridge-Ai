import { ApiError } from "./appiError.js";
import { ApiResponse } from "./apiResponse.js";

// Honor the thrown ApiError's status code instead of hardcoding 500, and return the
// standard ApiResponse shape. Without this, a `throw new ApiError(401, ...)` reached the
// client as a 500 — which meant the frontend's 401-refresh interceptor never fired, so
// protected routes flashed an error on hard reload until react-query happened to retry.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const statusCode = err instanceof ApiError ? err.statusCode : 500;
    const message = err?.message || "Internal Server Error";
    console.error(err);
    res.status(statusCode).json(new ApiResponse(statusCode, null, message));
  });
};
