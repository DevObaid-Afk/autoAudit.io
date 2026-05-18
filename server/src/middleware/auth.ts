import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const LAST_SEEN_UPDATE_MS = 5 * 60 * 1000;

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

  if (user.passwordChangedAt && payload.iat && payload.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppError("Session expired. Please log in again.", 401);
  }

  if (payload.sessionId) {
    const session = await Session.findOne({
      _id: payload.sessionId,
      userId: user._id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).select("+tokenHash");

    if (!session) {
      throw new AppError("Session expired. Please log in again.", 401);
    }

    if (!(await bcrypt.compare(token, session.tokenHash))) {
      throw new AppError("Session expired. Please log in again.", 401);
    }

    const shouldUpdateLastSeen = !session.lastSeenAt || Date.now() - new Date(session.lastSeenAt).getTime() > LAST_SEEN_UPDATE_MS;
    if (shouldUpdateLastSeen) {
      session.lastSeenAt = new Date();
      await session.save();
    }
  }

  req.user = user;
  req.companyId = user.company;
  req.authToken = token;
  req.sessionId = payload.sessionId;
  next();
});
