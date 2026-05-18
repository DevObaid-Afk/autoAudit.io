import mongoose from "mongoose";
import { env } from "../config/env.js";
import { captureException } from "../config/sentry.js";
import { AppError } from "../utils/AppError.js";
import { PlanLimitError } from "../utils/PlanLimitError.js";

export function notFoundHandler(req: any, _res: any, next: any) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(error: any, req: any, res: any, _next: any) {
  if (error instanceof PlanLimitError) {
    res.status(error.statusCode).json({
      error: "plan_limit_reached",
      limitType: error.limitType,
      currentUsage: error.currentUsage,
      planLimit: error.planLimit,
      upgradeToUnlock: error.upgradeToUnlock,
      message: error.message,
      requestId: req.id,
    });
    return;
  }

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

  if (statusCode >= 500 && env.nodeEnv !== "test") {
    captureException(error, {
      path: req.originalUrl,
      method: req.method,
      requestId: req.id,
    });
    console.error({
      message: error.message,
      stack: error.stack,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id,
    });
  }

  res.status(statusCode).json({
    error: {
      message,
      details,
      requestId: req.id,
      stack: env.nodeEnv === "production" ? undefined : error.stack,
    },
  });
}
