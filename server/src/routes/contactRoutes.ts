import { Router } from "express";
import { createContactRequest, createUpgradeRequest, listContactRequests, updateContactRequest } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMinimumRole } from "../middleware/roles.js";

export const contactRoutes = Router();

contactRoutes.post("/", createContactRequest);
contactRoutes.post("/upgrade", requireAuth, createUpgradeRequest);
contactRoutes.get("/", requireAuth, requireMinimumRole("admin"), listContactRequests);
contactRoutes.patch("/:id", requireAuth, requireMinimumRole("admin"), updateContactRequest);
