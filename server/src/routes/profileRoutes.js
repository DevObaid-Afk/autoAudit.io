import { Router } from "express";
import { getMe } from "../controllers/profileController.js";

export const profileRoutes = Router();

profileRoutes.get("/me", getMe);

