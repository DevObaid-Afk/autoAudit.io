import { Router } from "express";
import { createAnalyticsEvent } from "../controllers/analyticsController.js";

export const analyticsRoutes = Router();

analyticsRoutes.post("/", createAnalyticsEvent);
