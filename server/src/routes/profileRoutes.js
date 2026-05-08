import { Router } from "express";
import { getMe, updateCompanySettings } from "../controllers/profileController.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const profileRoutes = Router();

profileRoutes.get("/me", getMe);
profileRoutes.patch("/company-settings", requireMinimumRole("admin"), updateCompanySettings);
