import { Router } from "express";
import { generateAvatar, getAvatarAccess, getMe, removeAvatar, saveGeneratedAvatar, updateCompanySettings, uploadAvatar } from "../controllers/profileController.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const profileRoutes = Router();

profileRoutes.get("/me", getMe);
profileRoutes.get("/avatar-access", getAvatarAccess);
profileRoutes.post("/avatar-upload", uploadAvatar);
profileRoutes.post("/avatar-generate", generateAvatar);
profileRoutes.post("/avatar-save", saveGeneratedAvatar);
profileRoutes.delete("/avatar", removeAvatar);
profileRoutes.patch("/company-settings", requireMinimumRole("admin"), updateCompanySettings);
