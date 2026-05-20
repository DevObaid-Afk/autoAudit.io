import { Router } from "express";
import { listRenewals, markRenewalReviewed, updateRenewal } from "../controllers/renewalController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const renewalRoutes = Router();

renewalRoutes.get("/", listRenewals);
renewalRoutes.patch("/:id", requireObjectId("id"), requireMinimumRole("admin"), updateRenewal);
renewalRoutes.patch("/:id/reviewed", requireObjectId("id"), requireMinimumRole("member"), markRenewalReviewed);
