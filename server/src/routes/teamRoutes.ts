import { Router } from "express";
import { acceptTeamInvite, cancelTeamInvite, inviteTeamMember, listPendingInvites, listTeamMembers, removeTeamMember, updateTeamMemberRole } from "../controllers/teamController.js";
import { requireMinimumRole, requireRole } from "../middleware/roles.js";

export const teamRoutes = Router();

teamRoutes.get("/invite/:token", acceptTeamInvite);
teamRoutes.get("/members", requireMinimumRole("admin"), listTeamMembers);
teamRoutes.get("/invites", requireMinimumRole("admin"), listPendingInvites);
teamRoutes.post("/invite", requireMinimumRole("admin"), inviteTeamMember);
teamRoutes.patch("/members/:userId/role", requireRole("owner"), updateTeamMemberRole);
teamRoutes.delete("/members/:userId", requireRole("owner"), removeTeamMember);
teamRoutes.delete("/invite/:inviteId", requireMinimumRole("admin"), cancelTeamInvite);
