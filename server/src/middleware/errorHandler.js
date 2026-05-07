import mongoose from "mongoose";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode ?? 500;
  let message = error.message ?? "Internal server error";
  let details = error.details;

  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map((item) => item.message);
  }

  if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid resource id";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "A record with this value already exists";
    details = error.keyValue;
  }

  res.status(statusCode).json({
    error: {
      message,
      details,
      stack: env.nodeEnv === "production" ? undefined : error.stack,
    },
  });
}

