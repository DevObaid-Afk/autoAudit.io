import { Router } from "express";
import { listActivity } from "../controllers/activityController.js";

export const activityRoutes = Router();

activityRoutes.get("/", listActivity);
