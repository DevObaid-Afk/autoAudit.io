import { Router } from "express";
import {
  addActionItemComment,
  approveActionItem,
  assignActionItem,
  completeActionItem,
  createActionItem,
  deleteActionItem,
  listActionItems,
  rejectActionItem,
  updateActionItem,
} from "../controllers/actionItemController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const actionItemRoutes = Router();

actionItemRoutes.get("/", listActionItems);
actionItemRoutes.post("/", requireMinimumRole("member"), createActionItem);
actionItemRoutes.patch("/:id", requireObjectId("id"), requireMinimumRole("member"), updateActionItem);
actionItemRoutes.patch("/:id/assign", requireObjectId("id"), requireMinimumRole("admin"), assignActionItem);
actionItemRoutes.patch("/:id/approve", requireObjectId("id"), requireMinimumRole("admin"), approveActionItem);
actionItemRoutes.patch("/:id/reject", requireObjectId("id"), requireMinimumRole("admin"), rejectActionItem);
actionItemRoutes.post("/:id/comments", requireObjectId("id"), requireMinimumRole("member"), addActionItemComment);
actionItemRoutes.patch("/:id/complete", requireObjectId("id"), requireMinimumRole("member"), completeActionItem);
actionItemRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("admin"), deleteActionItem);
