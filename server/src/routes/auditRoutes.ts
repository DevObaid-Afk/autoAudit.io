import { Router } from "express";
import { flushAuditSummaryCache, getAuditSummary } from "../controllers/auditController.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const auditRoutes = Router();

auditRoutes.get("/summary", getAuditSummary);
auditRoutes.post("/flush-cache", requireMinimumRole("owner"), flushAuditSummaryCache);
