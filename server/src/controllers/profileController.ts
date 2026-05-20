import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { cleanNumber } from "../middleware/validate.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import fs from "node:fs/promises";
import path from "node:path";

const AVATAR_UPLOAD_DIR = path.resolve("server", "uploads", "avatars");
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_SIZE = 200;

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

export const uploadAvatar = asyncHandler(async (req, res) => {
  const { imageData } = req.body;
  const parsed = parseAvatarDataUrl(imageData);
  const resizedBuffer = await resizeAvatarImage(parsed.buffer);
  const avatarUrl = await writeAvatarFile({
    buffer: resizedBuffer,
    extension: "webp",
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
    { $unset: { avatarUrl: "", avatarUpdatedAt: "" }, $set: { avatarSource: "gravatar" } },
    { new: true, runValidators: true },
  ).select("-passwordHash");

  await recordAuditLog(req, {
    action: "profile.avatar_removed",
    resourceType: "user",
    resourceId: req.user._id,
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

function parseAvatarDataUrl(value) {
  if (typeof value !== "string") {
    throw new AppError("Avatar image data is required", 400);
  }

  const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new AppError("Avatar must be a JPEG, PNG, or WebP image", 400);
  }

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new AppError("Avatar image must be 2MB or smaller", 400);
  }

  return { buffer, extension };
}

async function resizeAvatarImage(buffer) {
  try {
    const sharp = await loadSharp();
    return await sharp(buffer)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "center" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new AppError("Avatar image could not be processed. Use a JPEG, PNG, or WebP image.", 400);
  }
}

async function loadSharp() {
  const importer = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<{ default: any }>;
  const sharpModule = await importer("sharp");
  return sharpModule.default;
}

async function writeAvatarFile({ buffer, extension, userId, prefix }) {
  await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true });
  const safeUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `${prefix}-${safeUserId}-${Date.now()}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}.${extension}`;
  const filePath = path.join(AVATAR_UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/avatars/${filename}`;
}
