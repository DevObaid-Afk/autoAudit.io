import { Router } from "express";
import { createSavingsEntry, deleteSavingsEntry, dismissSavingsEntry, getSavingsSummary, listSavingsEntries, realizeSavingsEntry } from "../controllers/savingsController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const savingsRoutes = Router();

savingsRoutes.get("/", listSavingsEntries);
savingsRoutes.get("/summary", getSavingsSummary);
savingsRoutes.post("/", createSavingsEntry);
savingsRoutes.patch("/:id/realize", requireObjectId("id"), realizeSavingsEntry);
savingsRoutes.patch("/:id/dismiss", requireObjectId("id"), dismissSavingsEntry);
savingsRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("admin"), deleteSavingsEntry);
