import jwt, { type SignOptions } from "jsonwebtoken";
import type { IUserDocument } from "../models/User.js";
import { env } from "../config/env.js";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function signAuthToken(user: IUserDocument, sessionId?: string) {
  return signAccessToken(user, sessionId);
}

export function signAccessToken(user: IUserDocument, sessionId?: string) {
  const companyId = user.company?._id ?? user.company;

  return jwt.sign(
    {
      userId: user._id.toString(),
      companyId: companyId.toString(),
      role: user.role,
      sessionId,
    },
    env.jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as SignOptions,
  );
}

export function signRefreshToken(user: IUserDocument, sessionId?: string) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      type: "refresh",
      tokenVersion: "v1",
      sessionId,
    },
    env.jwtSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions,
  );
}
