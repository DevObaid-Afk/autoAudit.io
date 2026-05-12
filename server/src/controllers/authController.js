import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken } from "../utils/auth.js";
import { cleanString } from "../middleware/validate.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/emailService.js";

const VERIFICATION_TOKEN_MINUTES = 24 * 60;
const PASSWORD_RESET_TOKEN_MINUTES = 30;

export const signup = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, { required: true, field: "Name", max: 120 });
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });
  const companyName = cleanString(req.body.companyName, { required: true, field: "Company name", max: 120 });
  const companyDomain = cleanString(req.body.companyDomain, { field: "Company domain", max: 120 })?.toLowerCase();
  const plan = cleanPlan(req.body.plan);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new AppError("Email must be valid", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError("An account already exists for this email", 409);
  }

  const company = await Company.create({
    name: companyName,
    domain: companyDomain,
    plan,
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const verification = createToken(VERIFICATION_TOKEN_MINUTES);
  const user = await User.create({
    name,
    email,
    passwordHash,
    company: company._id,
    role: "owner",
    emailVerificationTokenHash: verification.hash,
    emailVerificationExpiresAt: verification.expiresAt,
  });

  company.createdBy = user._id;
  await company.save();

  const token = signAuthToken(user);
  await sendVerificationEmail({ email: user.email, name: user.name, token: verification.token });

  res.status(201).json({
    token,
    user: serializeUser(user),
    company,
  });
});

export const requestEmailVerification = asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const user = await User.findOne({ email }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

  if (user && !user.emailVerifiedAt) {
    const verification = createToken(VERIFICATION_TOKEN_MINUTES);
    user.emailVerificationTokenHash = verification.hash;
    user.emailVerificationExpiresAt = verification.expiresAt;
    await user.save();
    await sendVerificationEmail({ email: user.email, name: user.name, token: verification.token });
  }

  res.json({ message: "If this email needs verification, a link has been sent." });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const token = cleanString(req.body.token, { required: true, field: "Verification token", max: 256 });
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpiresAt: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpiresAt");

  if (!user) {
    throw new AppError("Verification link is invalid or expired", 400);
  }

  user.emailVerifiedAt = new Date();
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  res.json({ message: "Email verified. You can keep using AutoAudit.ai." });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpiresAt");

  if (user) {
    const reset = createToken(PASSWORD_RESET_TOKEN_MINUTES);
    user.passwordResetTokenHash = reset.hash;
    user.passwordResetExpiresAt = reset.expiresAt;
    await user.save();
    await sendPasswordResetEmail({ email: user.email, name: user.name, token: reset.token });
  }

  res.json({ message: "If an account exists for that email, a password reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = cleanString(req.body.token, { required: true, field: "Reset token", max: 256 });
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+passwordHash +passwordResetTokenHash +passwordResetExpiresAt");

  if (!user) {
    throw new AppError("Password reset link is invalid or expired", 400);
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  res.json({ message: "Password reset. You can sign in with your new password." });
});

export const login = asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash").populate("company");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signAuthToken(user);

  res.json({
    token,
    user: serializeUser(user),
    company: user.company,
  });
});

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company?._id ?? user.company,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

function cleanPlan(value) {
  const allowedPlans = new Set(["free", "starter", "standard", "custom"]);

  if (typeof value !== "string") {
    return "free";
  }

  const plan = value.trim().toLowerCase();
  return allowedPlans.has(plan) ? plan : "free";
}

function createToken(minutesUntilExpiry) {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + minutesUntilExpiry * 60 * 1000),
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
