import { Router } from "express";
import { createContactRequest, listContactRequests, updateContactRequest } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const contactRoutes = Router();

contactRoutes.post("/", createContactRequest);
contactRoutes.get("/", requireAuth, requireMinimumRole("admin"), listContactRequests);
contactRoutes.patch("/:id", requireAuth, requireMinimumRole("admin"), updateContactRequest);
