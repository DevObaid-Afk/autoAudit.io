import { Router } from "express";
import { completeMfaChallenge, disableMfa, forgotPassword, handleGoogleOAuthCallback, listSessions, login, logout, refresh, requestEmailVerification, resetPassword, revokeOtherSessions, revokeSession, setupMfa, signup, startGoogleOAuth, unlockUser, updateSecurityPreferences, verifyEmail, verifyMfaSetup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit, mfaChallengeRateLimit } from "../middleware/rateLimit.js";
import { requireRole } from "../middleware/roles.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signup);
authRoutes.post("/login", authRateLimit, login);
authRoutes.post("/refresh", authRateLimit, refresh);
authRoutes.post("/logout", logout);
authRoutes.post("/mfa/challenge", mfaChallengeRateLimit, completeMfaChallenge);
authRoutes.post("/mfa/setup", requireAuth, setupMfa);
authRoutes.post("/mfa/verify-setup", requireAuth, mfaChallengeRateLimit, verifyMfaSetup);
authRoutes.post("/mfa/disable", requireAuth, mfaChallengeRateLimit, disableMfa);
authRoutes.get("/sessions", requireAuth, listSessions);
authRoutes.delete("/sessions", requireAuth, revokeOtherSessions);
authRoutes.delete("/sessions/:sessionId", requireAuth, revokeSession);
authRoutes.patch("/security-preferences", requireAuth, updateSecurityPreferences);
authRoutes.post("/unlock", requireAuth, requireRole("admin"), unlockUser);
authRoutes.get("/google", authRateLimit, startGoogleOAuth);
authRoutes.get("/google/callback", authRateLimit, handleGoogleOAuthCallback);
authRoutes.post("/verify-email", authRateLimit, verifyEmail);
authRoutes.post("/request-email-verification", authRateLimit, requestEmailVerification);
authRoutes.post("/forgot-password", authRateLimit, forgotPassword);
authRoutes.post("/reset-password", authRateLimit, resetPassword);
