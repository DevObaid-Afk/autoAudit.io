import { Router } from "express";
import { forgotPassword, handleGoogleOAuthCallback, login, requestEmailVerification, resetPassword, signup, startGoogleOAuth, verifyEmail } from "../controllers/authController.js";
import { authRateLimit } from "../middleware/rateLimit.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signup);
authRoutes.post("/login", authRateLimit, login);
authRoutes.get("/google", authRateLimit, startGoogleOAuth);
authRoutes.get("/google/callback", authRateLimit, handleGoogleOAuthCallback);
authRoutes.post("/verify-email", authRateLimit, verifyEmail);
authRoutes.post("/request-email-verification", authRateLimit, requestEmailVerification);
authRoutes.post("/forgot-password", authRateLimit, forgotPassword);
authRoutes.post("/reset-password", authRateLimit, resetPassword);
