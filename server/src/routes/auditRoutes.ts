import { Router } from "express";
import { getAuditSummary } from "../controllers/auditController.js";

export const auditRoutes = Router();

auditRoutes.get("/summary", getAuditSummary);

