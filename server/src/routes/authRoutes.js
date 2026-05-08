import { Router } from "express";
import { login, signup } from "../controllers/authController.js";
import { authRateLimit } from "../middleware/rateLimit.js";

export const authRoutes = Router();

authRoutes.post("/signup", authRateLimit, signup);
authRoutes.post("/login", authRateLimit, login);
