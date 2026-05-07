import { Router } from "express";
import { generateReport } from "../controllers/reportController.js";

export const reportRoutes = Router();

reportRoutes.post("/generate", generateReport);

