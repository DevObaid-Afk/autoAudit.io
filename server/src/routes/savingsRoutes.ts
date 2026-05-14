import { Router } from "express";
import { createSavingsEntry, deleteSavingsEntry, getSavingsSummary, listSavingsEntries } from "../controllers/savingsController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const savingsRoutes = Router();

savingsRoutes.get("/", listSavingsEntries);
savingsRoutes.get("/summary", getSavingsSummary);
savingsRoutes.post("/", createSavingsEntry);
savingsRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("admin"), deleteSavingsEntry);
