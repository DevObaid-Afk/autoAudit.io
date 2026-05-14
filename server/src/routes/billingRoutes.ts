import { Router } from "express";
import { createCheckoutSession } from "../controllers/billingController.js";

export const billingRoutes = Router();

billingRoutes.post("/checkout", createCheckoutSession);
