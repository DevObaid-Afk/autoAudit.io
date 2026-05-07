import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAuthToken(user) {
  const companyId = user.company?._id ?? user.company;

  return jwt.sign(
    {
      userId: user._id.toString(),
      companyId: companyId.toString(),
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}
