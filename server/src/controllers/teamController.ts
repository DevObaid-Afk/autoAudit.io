import crypto from "node:crypto";
import { TeamInvite, type InviteRole } from "../models/TeamInvite.js";
import { User, type UserRole } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { completeOnboardingStep } from "../utils/onboarding.js";
import { cleanString } from "../middleware/validate.js";
import { sendTeamInviteEmail } from "../services/emailService.js";
import { trackActivationEvent } from "../services/activationAnalytics.js";

const INVITE_DAYS = 7;
const inviteRoles = new Set<InviteRole>(["viewer", "member", "admin"]);

export const inviteTeamMember = asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const role = cleanInviteRole(req.body.role);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new AppError("Email must be valid", 400);
  }

  const existingMember = await User.findOne({ email, company: req.companyId });
  if (existingMember) {
    throw new AppError("This user is already a member of the workspace", 409);
  }

  const existingInvite = await TeamInvite.findOne({
    email,
    companyId: req.companyId,
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (existingInvite) {
    throw new AppError("This email already has a pending invite", 409);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const invite = await TeamInvite.create({
    email,
    role,
    token,
    companyId: req.companyId,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
    createdBy: req.user?._id,
  });

  await sendTeamInviteEmail({
    email,
    role,
    companyName: "AutoAudit.ai workspace",
    inviterName: req.user?.name ?? "A workspace admin",
    token,
    companyId: req.companyId,
  });

  await recordAuditLog(req, {
    action: "team.invite_created",
    resourceType: "team_invite",
    resourceId: invite._id,
    metadata: { email, role },
  });
  await recordActivity(req, {
    action: "team.member_invited",
    entityType: "team",
    entityId: invite._id,
    entityName: email,
    metadata: { role },
  });
  await completeOnboardingStep(req.companyId, "invitedTeammate");
  await trackActivationEvent({
    req,
    eventName: "teammate_invited",
    properties: { invitedRole: role },
  });

  res.status(201).json({ invite: serializeInvite(invite) });
});

export const acceptTeamInvite = asyncHandler(async (req, res) => {
  const token = cleanString(req.params.token, { required: true, field: "Invite token", max: 256 });
  const invite = await TeamInvite.findOne({
    token,
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });

  if (!invite) {
    throw new AppError("Invite is invalid or expired", 400);
  }

  if (!req.user || req.user.email.toLowerCase() !== invite.email) {
    throw new AppError("Sign in with the invited email address to accept this invite", 403);
  }

  const alreadyMember = String(req.user.company) === String(invite.companyId);
  if (alreadyMember) {
    throw new AppError("You are already a member of this workspace", 409);
  }

  req.user.company = invite.companyId;
  req.user.role = invite.role as UserRole;
  await req.user.save();

  invite.acceptedAt = new Date();
  await invite.save();

  const previousCompanyId = req.companyId;
  req.companyId = invite.companyId;
  await recordAuditLog(req, {
    action: "team.invite_accepted",
    resourceType: "team_invite",
    resourceId: invite._id,
    metadata: { email: invite.email, role: invite.role },
  });
  req.companyId = previousCompanyId;

  res.json({ member: serializeMember(req.user), invite: serializeInvite(invite) });
});

export const listTeamMembers = asyncHandler(async (req, res) => {
  const members = await User.find({ company: req.companyId })
    .select("name email role emailVerifiedAt createdAt avatarUrl avatarSource")
    .sort({ role: 1, name: 1 });

  res.json({ members: members.map(serializeMember) });
});

export const listPendingInvites = asyncHandler(async (req, res) => {
  const invites = await TeamInvite.find({
    companyId: req.companyId,
    acceptedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 });

  res.json({ invites: invites.map(serializeInvite) });
});

export const updateTeamMemberRole = asyncHandler(async (req, res) => {
  const role = cleanInviteRole(req.body.role);
  const member = await User.findOne({ _id: req.params.userId, company: req.companyId });

  if (!member) {
    throw new AppError("Team member not found", 404);
  }

  if (member.role === "owner") {
    throw new AppError("Workspace owner role cannot be changed here", 400);
  }

  const previousRole = member.role;
  member.role = role;
  await member.save();

  await recordAuditLog(req, {
    action: "team.member_role_changed",
    resourceType: "user",
    resourceId: member._id,
    metadata: { email: member.email, previousRole, role },
  });
  await recordActivity(req, {
    action: "team.role_changed",
    entityType: "team",
    entityId: member._id,
    entityName: member.email,
    metadata: { previousRole, role },
  });

  res.json({ member: serializeMember(member) });
});

export const removeTeamMember = asyncHandler(async (req, res) => {
  const member = await User.findOne({ _id: req.params.userId, company: req.companyId });

  if (!member) {
    throw new AppError("Team member not found", 404);
  }

  if (member.role === "owner") {
    throw new AppError("Workspace owner cannot be removed", 400);
  }

  if (String(member._id) === String(req.user?._id)) {
    throw new AppError("You cannot remove yourself from the workspace", 400);
  }

  await User.deleteOne({ _id: member._id });

  await recordAuditLog(req, {
    action: "team.member_removed",
    resourceType: "user",
    resourceId: member._id,
    metadata: { email: member.email, role: member.role },
  });
  await recordActivity(req, {
    action: "team.member_removed",
    entityType: "team",
    entityId: member._id,
    entityName: member.email,
    metadata: { role: member.role },
  });

  res.status(204).send();
});

export const cancelTeamInvite = asyncHandler(async (req, res) => {
  const invite = await TeamInvite.findOneAndDelete({
    _id: req.params.inviteId,
    companyId: req.companyId,
    acceptedAt: { $exists: false },
  });

  if (!invite) {
    throw new AppError("Pending invite not found", 404);
  }

  await recordAuditLog(req, {
    action: "team.invite_cancelled",
    resourceType: "team_invite",
    resourceId: invite._id,
    metadata: { email: invite.email, role: invite.role },
  });

  res.status(204).send();
});

function cleanInviteRole(value: unknown): InviteRole {
  if (typeof value === "string" && inviteRoles.has(value as InviteRole)) {
    return value as InviteRole;
  }

  throw new AppError("Role must be viewer, member, or admin", 400);
}

function serializeMember(user: any) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    joinedAt: user.createdAt,
    emailVerifiedAt: user.emailVerifiedAt,
    avatarUrl: user.avatarUrl,
    avatarSource: user.avatarSource,
  };
}

function serializeInvite(invite: any) {
  return {
    id: invite._id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    acceptedAt: invite.acceptedAt,
    createdAt: invite.createdAt,
    createdBy: invite.createdBy,
  };
}
