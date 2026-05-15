import { Router } from "express";
import { deleteReport, generateReport, listReports } from "../controllers/reportController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const reportRoutes = Router();

reportRoutes.get("/", listReports);
reportRoutes.post("/generate", generateReport);
reportRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("admin"), deleteReport);
