import { Router } from "express";
import { deleteReport, exportReportPdf, generateReport, listReports } from "../controllers/reportController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const reportRoutes = Router();

reportRoutes.get("/", listReports);
reportRoutes.post("/generate", generateReport);
reportRoutes.post("/:id/export-pdf", requireObjectId("id"), exportReportPdf);
reportRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("admin"), deleteReport);
