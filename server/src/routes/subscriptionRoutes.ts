import { Router } from "express";
import { createSubscription, listSubscriptions, updateSubscription } from "../controllers/subscriptionController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const subscriptionRoutes = Router();

subscriptionRoutes.get("/", listSubscriptions);
subscriptionRoutes.post("/", requireMinimumRole("admin"), createSubscription);
subscriptionRoutes.patch("/:id", requireObjectId("id"), requireMinimumRole("admin"), updateSubscription);
