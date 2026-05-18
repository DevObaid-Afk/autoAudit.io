import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const standardOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.nodeEnv === "test",
};

export const apiRateLimit = rateLimit({
  ...standardOptions,
  windowMs: env.rateLimitWindowMs,
  limit: env.rateLimitMax,
  message: { error: { message: "Too many requests. Please try again soon." } },
});

export const authRateLimit = rateLimit({
  ...standardOptions,
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMax,
  message: { error: { message: "Too many sign-in attempts. Please wait and try again." } },
});

// MFA challenges should be rate limited strictly: max 5 attempts per 15 minutes.
export const mfaChallengeRateLimit = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: { message: "Too many MFA attempts. Please wait and try again." } },
});

export const aiRateLimit = rateLimit({
  ...standardOptions,
  windowMs: env.aiRateLimitWindowMs,
  limit: env.aiRateLimitMax,
  message: { error: { message: "AI request limit reached. Please wait and try again." } },
});
