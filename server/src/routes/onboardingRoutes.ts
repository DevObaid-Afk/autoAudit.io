import { Router } from "express";
import { completeOnboarding, dismissOnboarding, getOnboarding } from "../controllers/onboardingController.js";

export const onboardingRoutes = Router();

onboardingRoutes.get("/", getOnboarding);
onboardingRoutes.patch("/complete", completeOnboarding);
onboardingRoutes.patch("/dismiss", dismissOnboarding);
