import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { cleanNumber } from "../middleware/validate.js";
import { generateAiImage } from "../services/openaiService.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import fs from "node:fs/promises";
import path from "node:path";

const AVATAR_UPLOAD_DIR = path.resolve("server", "uploads", "avatars");
const AVATAR_STYLES = {
  professional_executive: "Professional Executive: refined executive headshot, tailored blazer, calm confident expression, premium corporate lighting",
  minimal_3d: "Minimal 3D: polished but restrained 3D portrait, clean geometry, soft studio lighting, professional SaaS tone",
  modern_gradient_portrait: "Modern Gradient Portrait: realistic professional portrait with subtle navy and cyan gradient lighting, premium fintech look",
  abstract_corporate: "Abstract Corporate: professional abstract avatar, clean facial silhouette, executive dark-mode palette, not cartoonish",
  founder_style: "Founder Style: approachable startup founder portrait, smart casual, calm confident expression, polished editorial lighting",
  cyber_minimal: "Cyber Minimal: understated technical executive portrait, minimal cyan accents, no hacker or cybersecurity tropes",
  clean_illustrated: "Clean Illustrated: mature editorial illustration, crisp shapes, professional proportions, subtle dark SaaS palette",
  finance_ops: "Finance & Ops: finance operations leader portrait, analytical, composed, premium office lighting",
};

const AVATAR_LIMITS = {
  free: 0,
  starter: 3,
  standard: 20,
  growth: 20,
  enterprise: null,
  custom: null,
};

export const getMe = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId);

  res.json({
    user: req.user,
    company,
  });
});

export const updateCompanySettings = asyncHandler(async (req, res) => {
  const settings = {
    requireCfoApprovalAbove: cleanNumber(req.body.requireCfoApprovalAbove, { field: "CFO approval threshold", min: 0, max: 100000000 }),
    weeklyRenewalDigest: cleanBoolean(req.body.weeklyRenewalDigest, "Weekly renewal digest"),
    autoDraftCancellationEmails: cleanBoolean(req.body.autoDraftCancellationEmails, "Auto-draft cancellation emails"),
    allowManagedRenegotiation: cleanBoolean(req.body.allowManagedRenegotiation, "Managed renegotiation"),
  };

  const update = Object.fromEntries(
    Object.entries(settings)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [`settings.${key}`, value]),
  );

  if (Object.keys(update).length === 0) {
    throw new AppError("At least one setting is required", 400);
  }

  const company = await Company.findByIdAndUpdate(req.companyId, { $set: update }, { new: true, runValidators: true });
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  await recordAuditLog(req, {
    action: "company.settings_updated",
    resourceType: "company",
    resourceId: company._id,
    metadata: { fields: Object.keys(update) },
  });
  await recordActivity(req, {
    action: "settings.updated",
    entityType: "settings",
    entityId: company._id,
    entityName: company.name,
    metadata: { fields: Object.keys(update).map((field) => field.replace("settings.", "")) },
  });

  res.json({ company });
});

export const getAvatarAccess = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  res.json({ avatar: buildAvatarAccess(req.user, company) });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const { imageData } = req.body;
  const parsed = parseAvatarDataUrl(imageData);
  const avatarUrl = await writeAvatarFile({
    buffer: parsed.buffer,
    extension: parsed.extension,
    userId: req.user._id,
    prefix: "upload",
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatarUrl, avatarSource: "upload", avatarUpdatedAt: new Date() } },
    { new: true, runValidators: true },
  ).select("-passwordHash");

  await recordAuditLog(req, {
    action: "profile.avatar_uploaded",
    resourceType: "user",
    resourceId: req.user._id,
    metadata: { source: "upload" },
  });

  res.json({ user });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { avatarUrl: "", avatarUpdatedAt: "" }, $set: { avatarSource: "initials" } },
    { new: true, runValidators: true },
  ).select("-passwordHash");

  await recordAuditLog(req, {
    action: "profile.avatar_removed",
    resourceType: "user",
    resourceId: req.user._id,
  });

  res.json({ user });
});

export const generateAvatar = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  const access = buildAvatarAccess(req.user, company);
  if (!access.canGenerate) {
    throw new AppError(company.plan === "free" ? "AI avatar generation is available on paid plans." : "AI avatar generation limit reached for this month.", 403);
  }

  const style = cleanAvatarStyle(req.body.style);
  const prompt = buildAvatarPrompt({ style, user: req.user, company });
  const imageBuffer = await generateAiImage({ prompt, size: "1024x1024", quality: "medium" });
  const generatedUrl = await writeAvatarFile({
    buffer: imageBuffer,
    extension: "png",
    userId: req.user._id,
    prefix: "generated",
  });

  const usage = nextAvatarUsage(req.user.avatarGenerationUsage);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatarGenerationUsage: usage } },
    { new: true, runValidators: true },
  ).select("-passwordHash");

  await recordAuditLog(req, {
    action: "profile.avatar_generated",
    resourceType: "user",
    resourceId: req.user._id,
    metadata: { style },
  });

  res.json({
    generatedUrl,
    avatar: buildAvatarAccess(user, company),
  });
});

export const saveGeneratedAvatar = asyncHandler(async (req, res) => {
  const avatarUrl = cleanGeneratedAvatarUrl(req.body.avatarUrl);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { avatarUrl, avatarSource: "ai", avatarUpdatedAt: new Date() } },
    { new: true, runValidators: true },
  ).select("-passwordHash");

  await recordAuditLog(req, {
    action: "profile.avatar_saved",
    resourceType: "user",
    resourceId: req.user._id,
    metadata: { source: "ai" },
  });

  res.json({ user });
});

function cleanBoolean(value, field) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new AppError(`${field} must be true or false`, 400);
  }
  return value;
}

function buildAvatarAccess(user, company) {
  const usage = normalizeAvatarUsage(user.avatarGenerationUsage);
  const limit = AVATAR_LIMITS[company.plan] ?? 0;
  const used = usage.count;
  const remaining = limit === null ? null : Math.max(0, limit - used);

  return {
    plan: company.plan,
    canGenerate: limit === null || remaining > 0,
    limit,
    used,
    remaining,
    resetDate: getNextMonthStart(usage.periodStart).toISOString(),
    styles: Object.keys(AVATAR_STYLES),
  };
}

type AvatarUsage = {
  periodStart?: Date | string;
  count?: number;
};

function normalizeAvatarUsage(usage: AvatarUsage = {}) {
  const periodStart = getMonthStart(usage.periodStart ? new Date(usage.periodStart) : new Date());
  const currentPeriod = getMonthStart(new Date());

  if (periodStart.getTime() !== currentPeriod.getTime()) {
    return { periodStart: currentPeriod, count: 0 };
  }

  return { periodStart, count: Number(usage.count ?? 0) };
}

function nextAvatarUsage(usage: AvatarUsage) {
  const normalized = normalizeAvatarUsage(usage);
  return {
    periodStart: normalized.periodStart,
    count: normalized.count + 1,
  };
}

function getMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getNextMonthStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function cleanAvatarStyle(value) {
  if (!value || !AVATAR_STYLES[value]) {
    throw new AppError("Choose a supported avatar style", 400);
  }

  return value;
}

function buildAvatarPrompt({ style, user, company }) {
  return [
    "Create a square 1:1 professional AI avatar for a premium dark-mode SaaS operations dashboard.",
    "The image must be clean at small sizes, polished, executive, non-playful, and suitable for finance and operations leaders.",
    "Avoid anime, fantasy, memes, childish cartooning, exaggerated expressions, logos, text, watermarks, and social-media influencer styling.",
    `Style direction: ${AVATAR_STYLES[style]}.`,
    `User context: ${user.name}, ${user.role} at ${company.name}.`,
    "Use deep navy, charcoal, cyan-blue accents, subtle emerald highlights, and soft studio contrast.",
    "Centered shoulders-up composition, simple background, high-quality dashboard-ready finish.",
  ].join(" ");
}

function parseAvatarDataUrl(value) {
  if (typeof value !== "string") {
    throw new AppError("Avatar image data is required", 400);
  }

  const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new AppError("Avatar must be a PNG, JPG, or WebP image", 400);
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    throw new AppError("Avatar image must be 5MB or smaller", 400);
  }

  return { buffer, extension };
}

async function writeAvatarFile({ buffer, extension, userId, prefix }) {
  await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${prefix}-${safeUserId}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}.${extension}`;
  const filePath = path.join(AVATAR_UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/avatars/${filename}`;
}

function cleanGeneratedAvatarUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/uploads/avatars/generated-")) {
    throw new AppError("Generated avatar URL is invalid", 400);
  }

  return value;
}
