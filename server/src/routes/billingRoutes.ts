import { Router } from "express";
import { createBillingPortalSession, createCheckoutSession } from "../controllers/billingController.js";

export const billingRoutes = Router();

billingRoutes.post("/checkout", createCheckoutSession);
billingRoutes.post("/portal", createBillingPortalSession);
