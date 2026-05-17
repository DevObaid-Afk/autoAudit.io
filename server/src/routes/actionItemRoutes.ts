import { Router } from "express";
import { createActionItem, deleteActionItem, listActionItems, updateActionItem } from "../controllers/actionItemController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const actionItemRoutes = Router();

actionItemRoutes.get("/", listActionItems);
actionItemRoutes.post("/", requireMinimumRole("member"), createActionItem);
actionItemRoutes.patch("/:id", requireObjectId("id"), requireMinimumRole("member"), updateActionItem);
actionItemRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("admin"), deleteActionItem);
