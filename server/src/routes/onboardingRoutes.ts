import { Router } from "express";
import { dismissOnboarding, getOnboarding } from "../controllers/onboardingController.js";

export const onboardingRoutes = Router();

onboardingRoutes.get("/", getOnboarding);
onboardingRoutes.patch("/dismiss", dismissOnboarding);
