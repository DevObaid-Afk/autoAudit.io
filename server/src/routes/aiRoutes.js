import { Router } from "express";
import { generateCancelEmail } from "../controllers/aiController.js";

export const aiRoutes = Router();

aiRoutes.post("/cancel-email", generateCancelEmail);

