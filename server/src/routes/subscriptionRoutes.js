import { Router } from "express";
import { createSubscription, listSubscriptions } from "../controllers/subscriptionController.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const subscriptionRoutes = Router();

subscriptionRoutes.get("/", listSubscriptions);
subscriptionRoutes.post("/", requireMinimumRole("admin"), createSubscription);
