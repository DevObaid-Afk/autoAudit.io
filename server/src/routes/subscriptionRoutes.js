import { Router } from "express";
import { createSubscription, listSubscriptions } from "../controllers/subscriptionController.js";

export const subscriptionRoutes = Router();

subscriptionRoutes.get("/", listSubscriptions);
subscriptionRoutes.post("/", createSubscription);

