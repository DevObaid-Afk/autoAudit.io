import { Router } from "express";
import { deleteWorkspace, exportWorkspace } from "../controllers/workspaceController.js";
import { requireRole } from "../middleware/roles.js";

export const workspaceRoutes = Router();

workspaceRoutes.post("/export", requireRole("owner"), exportWorkspace);
workspaceRoutes.delete("/", requireRole("owner"), deleteWorkspace);
