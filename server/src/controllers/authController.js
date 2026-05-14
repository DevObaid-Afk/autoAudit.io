import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken } from "../utils/auth.js";
import { cleanString } from "../middleware/validate.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/emailService.js";

const VERIFICATION_TOKEN_MINUTES = 24 * 60;
const PASSWORD_RESET_TOKEN_MINUTES = 30;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const OAUTH_STATE_COOKIE = "autoaudit_oauth_state";

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

export const startGoogleOAuth = asyncHandler(async (req, res) => {
  ensureGoogleOAuthConfigured();

  const returnTo = cleanOAuthReturnTo(req.query.returnTo);
  const plan = cleanPlan(req.query.plan);
  const state = createOAuthState({ returnTo, plan });
  const authUrl = new URL(GOOGLE_AUTH_URL);

  authUrl.searchParams.set("client_id", env.googleClientId);
  authUrl.searchParams.set("redirect_uri", env.googleOAuthRedirectUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 10 * 60 * 1000,
  });

  res.redirect(authUrl.toString());
});

export const handleGoogleOAuthCallback = asyncHandler(async (req, res) => {
  ensureGoogleOAuthConfigured();

  const code = cleanString(req.query.code, { required: true, field: "Google authorization code", max: 4096 });
  const state = cleanString(req.query.state, { required: true, field: "OAuth state", max: 4096 });
  const cookieState = readCookie(req, OAUTH_STATE_COOKIE);

  if (!cookieState || cookieState !== state) {
    throw new AppError("Google sign-in session expired. Please try again.", 400);
  }

  const statePayload = verifyOAuthState(state);
  const googleTokens = await exchangeGoogleCode(code);
  const googleProfile = await verifyGoogleIdToken(googleTokens.id_token);
  const { user, company } = await findOrCreateGoogleUser(googleProfile, statePayload.plan);
  const token = signAuthToken(user);
  const callbackUrl = new URL("/oauth/google", env.appUrl);

  callbackUrl.searchParams.set("token", token);
  callbackUrl.searchParams.set("returnTo", statePayload.returnTo);
  res.clearCookie(OAUTH_STATE_COOKIE);
  res.redirect(callbackUrl.toString());
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

async function findOrCreateGoogleUser(profile, plan) {
  let user = await User.findOne({
    $or: [{ googleId: profile.sub }, { email: profile.email }],
  }).populate("company");

  if (user) {
    let changed = false;

    if (!user.googleId) {
      user.googleId = profile.sub;
      changed = true;
    }

    if (!user.emailVerifiedAt && profile.email_verified) {
      user.emailVerifiedAt = new Date();
      changed = true;
    }

    if (!user.avatarUrl && profile.picture) {
      user.avatarUrl = profile.picture;
      user.avatarSource = "upload";
      user.avatarUpdatedAt = new Date();
      changed = true;
    }

    if (user.authProvider !== "google" && !user.passwordHash) {
      user.authProvider = "google";
      changed = true;
    }

    if (changed) {
      await user.save();
      user = await User.findById(user._id).populate("company");
    }

    return { user, company: user.company };
  }

  const companyDomain = profile.hd ?? getEmailDomain(profile.email);
  const company = await Company.create({
    name: companyDomain ? `${companyDomain} Workspace` : `${profile.name}'s Workspace`,
    domain: companyDomain,
    plan,
  });

  user = await User.create({
    name: profile.name,
    email: profile.email,
    authProvider: "google",
    googleId: profile.sub,
    company: company._id,
    role: "owner",
    emailVerifiedAt: profile.email_verified ? new Date() : undefined,
    avatarUrl: profile.picture,
    avatarSource: profile.picture ? "upload" : "initials",
    avatarUpdatedAt: profile.picture ? new Date() : undefined,
  });

  company.createdBy = user._id;
  await company.save();
  await user.populate("company");

  return { user, company };
}

function ensureGoogleOAuthConfigured() {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new AppError("Google sign-in is not configured yet", 503);
  }
}

function createOAuthState(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "10m",
    audience: "google-oauth",
    issuer: "autoaudit-api",
  });
}

function verifyOAuthState(state) {
  try {
    return jwt.verify(state, env.jwtSecret, {
      audience: "google-oauth",
      issuer: "autoaudit-api",
    });
  } catch {
    throw new AppError("Google sign-in session expired. Please try again.", 400);
  }
}

async function exchangeGoogleCode(code) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleOAuthRedirectUrl,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.id_token) {
    throw new AppError("Google sign-in could not be completed", 502);
  }

  return data;
}

async function verifyGoogleIdToken(idToken) {
  const tokenInfoUrl = new URL(GOOGLE_TOKENINFO_URL);
  tokenInfoUrl.searchParams.set("id_token", idToken);

  const response = await fetch(tokenInfoUrl);
  const profile = await response.json();

  if (!response.ok || profile.aud !== env.googleClientId || !profile.email) {
    throw new AppError("Google sign-in could not be verified", 401);
  }

  return {
    sub: profile.sub,
    email: String(profile.email).toLowerCase(),
    email_verified: profile.email_verified === "true" || profile.email_verified === true,
    name: profile.name || profile.email.split("@")[0],
    picture: profile.picture,
    hd: profile.hd,
  };
}

function cleanOAuthReturnTo(value) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//")) {
    return "/dashboard";
  }

  return value.slice(0, 300);
}

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return "";

  const value = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getEmailDomain(email) {
  const domain = email.split("@")[1];
  return domain && !["gmail.com", "googlemail.com"].includes(domain) ? domain : "";
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
