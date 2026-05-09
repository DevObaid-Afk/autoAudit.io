import { Router } from "express";
import { generateReport, listReports } from "../controllers/reportController.js";

export const reportRoutes = Router();

reportRoutes.get("/", listReports);
reportRoutes.post("/generate", generateReport);
