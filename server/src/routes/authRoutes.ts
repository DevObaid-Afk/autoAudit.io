import { Router } from "express";
import { forgotPassword, handleGoogleOAuthCallback, login, requestEmailVerification, resetPassword, signup, startGoogleOAuth, unlockUser, verifyEmail } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/rateLimit.js";
import { requireRole } from "../middleware/roles.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signup);
authRoutes.post("/login", authRateLimit, login);
authRoutes.post("/unlock", requireAuth, requireRole("admin"), unlockUser);
authRoutes.get("/google", authRateLimit, startGoogleOAuth);
authRoutes.get("/google/callback", authRateLimit, handleGoogleOAuthCallback);
authRoutes.post("/verify-email", authRateLimit, verifyEmail);
authRoutes.post("/request-email-verification", authRateLimit, requestEmailVerification);
authRoutes.post("/forgot-password", authRateLimit, forgotPassword);
authRoutes.post("/reset-password", authRateLimit, resetPassword);
