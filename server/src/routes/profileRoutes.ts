import { Router } from "express";
import { getMe, removeAvatar, updateCompanySettings, uploadAvatar } from "../controllers/profileController.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const profileRoutes = Router();

profileRoutes.get("/me", getMe);
profileRoutes.post("/avatar-upload", uploadAvatar);
profileRoutes.delete("/avatar", removeAvatar);
profileRoutes.patch("/company-settings", requireMinimumRole("admin"), updateCompanySettings);
