import { Router } from "express";
import { sendTestRenewalDigest } from "../controllers/notificationController.js";
import { requireRole } from "../middleware/roles.js";

export const notificationRoutes = Router();

notificationRoutes.post("/test-digest", requireRole("owner"), sendTestRenewalDigest);
