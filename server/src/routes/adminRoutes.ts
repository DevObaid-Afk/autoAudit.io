import { Router } from "express";
import { listEmailLogs } from "../controllers/adminController.js";
import { requireRole } from "../middleware/roles.js";

export const adminRoutes = Router();

adminRoutes.get("/email-logs", requireRole("owner"), listEmailLogs);
