import { Router } from "express";
import { listAuditLogs } from "../controllers/auditLogController.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const auditLogRoutes = Router();

auditLogRoutes.get("/", requireMinimumRole("admin"), listAuditLogs);
