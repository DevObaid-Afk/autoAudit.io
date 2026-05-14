import { Router } from "express";
import {
  analyzeVendor,
  generateCancelEmail,
  generateMonthlyReport,
  generateRenegotiateEmail,
} from "../controllers/aiController.js";

export const aiRoutes = Router();

aiRoutes.post("/cancel-email", generateCancelEmail);
aiRoutes.post("/renegotiate-email", generateRenegotiateEmail);
aiRoutes.post("/monthly-report", generateMonthlyReport);
aiRoutes.post("/vendor-analysis", analyzeVendor);
