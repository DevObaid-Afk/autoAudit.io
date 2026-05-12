import { Router } from "express";
import { forgotPassword, login, requestEmailVerification, resetPassword, signup, verifyEmail } from "../controllers/authController.js";
import { authRateLimit } from "../middleware/rateLimit.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signup);
authRoutes.post("/login", authRateLimit, login);
authRoutes.post("/verify-email", authRateLimit, verifyEmail);
authRoutes.post("/request-email-verification", authRateLimit, requestEmailVerification);
authRoutes.post("/forgot-password", authRateLimit, forgotPassword);
authRoutes.post("/reset-password", authRateLimit, resetPassword);
