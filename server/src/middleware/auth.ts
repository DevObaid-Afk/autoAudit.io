import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization ?? "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Authentication token is required", 401);
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError("Invalid or expired authentication token", 401);
  }

  const user = await User.findById(payload.userId).select("-passwordHash");

  if (!user) {
    throw new AppError("Authenticated user no longer exists", 401);
  }

  req.user = user;
  req.companyId = user.company;
  next();
});

