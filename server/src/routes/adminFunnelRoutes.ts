import { Router } from "express";
import { getFunnelAnalytics } from "../controllers/adminFunnelController.js";

export const adminFunnelRoutes = Router();

adminFunnelRoutes.get("/funnel", getFunnelAnalytics);
