import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { generateSecret, verifySync } from "otplib";
import QRCode from "qrcode";
import type { Request } from "express";
import { Company } from "../models/Company.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { AuditLog } from "../models/AuditLog.js";
import { Session } from "../models/Session.js";
import { User, type IUserDocument } from "../models/User.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { REFRESH_TOKEN_TTL_MS, signAccessToken, signRefreshToken } from "../utils/auth.js";
import { cleanString } from "../middleware/validate.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../services/emailService.js";
import { seedSampleVendors } from "../services/sampleVendors.js";
import { trackActivationEvent } from "../services/activationAnalytics.js";

const VERIFICATION_TOKEN_MINUTES = 24 * 60;
const PASSWORD_RESET_TOKEN_MINUTES = 30;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const OAUTH_STATE_COOKIE = "autoaudit_oauth_state";
const MFA_SESSION_EXPIRES_IN = "5m";

type Plan = "free" | "starter" | "standard" | "custom";

type OAuthStatePayload = JwtPayload & {
  returnTo: string;
  plan: Plan;
};

type RefreshTokenPayload = JwtPayload & {
  userId: string;
  type: "refresh";
  sessionId?: string;
};

type MfaSessionPayload = JwtPayload & {
  userId: string;
  type: "mfa";
};

type GoogleTokenResponse = {
  id_token: string;
};

type GoogleTokenInfo = {
  sub: string;
  aud: string;
  email: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  hd?: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
  hd?: string;
};

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
  } as any);

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
  } as any);

  company.createdBy = user._id;
  await company.save();
  await seedWorkspaceSamples(company._id);

  const tokens = await issueAuthTokens(user, req);
  await sendVerificationEmail({ email: user.email, name: user.name, token: verification.token, companyId: company._id });
  await trackActivationEvent({
    req,
    eventName: "user_signed_up",
    userId: user._id,
    companyId: company._id,
    properties: { plan, authMethod: "email" },
  });

  res.status(201).json({
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
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
    await sendVerificationEmail({ email: user.email, name: user.name, token: verification.token, companyId: user.company });
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
    await sendPasswordResetEmail({ email: user.email, name: user.name, token: reset.token, companyId: user.company });
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
  }).select("+passwordHash +passwordResetTokenHash +passwordResetExpiresAt +refreshTokenHash +refreshTokenExpiresAt");

  if (!user) {
    throw new AppError("Password reset link is invalid or expired", 400);
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  user.refreshTokenHash = undefined;
  user.refreshTokenExpiresAt = undefined;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
  await Session.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });

  res.json({ message: "Password reset. You can sign in with your new password." });
});

export const login = asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash").populate("company");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (isUserLocked(user)) {
    const minutesRemaining = getLockoutMinutesRemaining(user.lockoutUntil);
    throw new AppError(`Account temporarily locked. Try again after ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}.`, 423, {
      lockoutUntil: user.lockoutUntil,
      minutesRemaining,
    });
  }

  if (!(await user.comparePassword(password))) {
    await handleFailedPasswordLogin(user);
    throw new AppError(buildIncorrectPasswordMessage(user.failedLoginAttempts ?? 0), 401, { remainingAttempts: remainingLoginAttempts(user.failedLoginAttempts ?? 0) });
  }

  user.failedLoginAttempts = 0;
  user.lockoutUntil = null;
  await user.save();

  if (user.mfaEnabled) {
    res.json({
      mfaRequired: true,
      mfaSessionToken: signMfaSessionToken(user),
      message: "Enter your authenticator code to finish signing in.",
    });
    return;
  }

  const tokens = await issueAuthTokens(user, req);

  res.json({
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: serializeUser(user),
    company: user.company,
  });
});

export const setupMfa = asyncHandler(async (req, res) => {
  ensureMfaEncryptionConfigured();

  const secret = generateSecret();
  const user = await User.findById(req.user._id).select("+mfaTotpSecret");
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.mfaTotpSecret = encryptMfaSecret(secret);
  user.mfaEnabled = false;
  await user.save();

  const issuer = "AutoAudit.ai";
  const label = `${issuer}:${req.user.email}`;
  const otpauthUrl = `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&digits=6&period=30`;
  const qrCodeDataUri = await QRCode.toDataURL(otpauthUrl);

  res.json({ qrCodeDataUri, secret, label });
});

export const verifyMfaSetup = asyncHandler(async (req, res) => {
  const code = cleanString(req.body.code, { required: true, field: "MFA code", max: 40 });
  const user = await User.findById(req.user._id).select("+mfaTotpSecret +mfaBackupCodes");

  if (!user?.mfaTotpSecret) {
    throw new AppError("Start MFA setup before verifying a code", 400);
  }

  if (!verifyTotpCode(code, decryptMfaSecret(user.mfaTotpSecret))) {
    await logMfaAudit({ req, user, action: "mfa.setup_failed" });
    throw new AppError("Authenticator code is invalid", 400);
  }

  const backupCodes = generateBackupCodes();
  user.mfaEnabled = true;
  user.mfaBackupCodes = await Promise.all(backupCodes.map((backupCode) => bcrypt.hash(normalizeMfaCode(backupCode), 12)));
  await user.save();
  await logMfaAudit({ req, user, action: "mfa.enabled" });

  res.json({ backupCodes });
});

export const disableMfa = asyncHandler(async (req, res) => {
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });
  const code = cleanString(req.body.code, { required: true, field: "MFA code", max: 40 });
  const user = await User.findById(req.user._id).select("+passwordHash +mfaTotpSecret +mfaBackupCodes");

  if (!user || !user.mfaEnabled || !user.mfaTotpSecret) {
    throw new AppError("MFA is not enabled for this user", 400);
  }

  if (!user.passwordHash || !(await user.comparePassword(password))) {
    await logMfaAudit({ req, user, action: "mfa.disable_failed", metadata: { reason: "password" } });
    throw new AppError("Current password is incorrect", 401);
  }

  if (!verifyTotpCode(code, decryptMfaSecret(user.mfaTotpSecret))) {
    await logMfaAudit({ req, user, action: "mfa.disable_failed", metadata: { reason: "totp" } });
    throw new AppError("Authenticator code is invalid", 400);
  }

  user.mfaEnabled = false;
  user.mfaTotpSecret = undefined;
  user.mfaBackupCodes = [];
  await user.save();
  await logMfaAudit({ req, user, action: "mfa.disabled" });

  res.json({ mfaEnabled: false });
});

export const completeMfaChallenge = asyncHandler(async (req, res) => {
  const mfaSessionToken = cleanString(req.body.mfaSessionToken, { required: true, field: "MFA session token", max: 4096 });
  const code = cleanString(req.body.code, { required: true, field: "MFA code", max: 80 });
  const payload = verifyMfaSessionToken(mfaSessionToken);
  const user = await User.findById(payload.userId).select("+mfaTotpSecret +mfaBackupCodes").populate("company");

  if (!user || !user.mfaEnabled || !user.mfaTotpSecret) {
    throw new AppError("MFA challenge is invalid. Please sign in again.", 401);
  }

  const normalizedCode = normalizeMfaCode(code);
  const isTotpValid = verifyTotpCode(normalizedCode, decryptMfaSecret(user.mfaTotpSecret));
  const backupMatchIndex = isTotpValid ? -1 : await findBackupCodeMatch(normalizedCode, user.mfaBackupCodes ?? []);

  if (!isTotpValid && backupMatchIndex === -1) {
    await logMfaAudit({ req, user, action: "mfa.challenge_failed" });
    throw new AppError("MFA code is invalid", 401);
  }

  if (backupMatchIndex >= 0) {
    // Each backup code can only be used once; remove it after successful consumption.
    user.mfaBackupCodes = (user.mfaBackupCodes ?? []).filter((_, index) => index !== backupMatchIndex);
    await user.save();
  }

  await logMfaAudit({ req, user, action: "mfa.challenge_succeeded", metadata: { method: backupMatchIndex >= 0 ? "backup_code" : "totp" } });
  const tokens = await issueAuthTokens(user, req);

  res.json({
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: serializeUser(user),
    company: user.company,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = cleanString(req.body.refreshToken, { required: true, field: "Refresh token", max: 4096 });
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.userId).select("+refreshTokenHash +refreshTokenExpiresAt");

  if (!user || !user.refreshTokenHash || !user.refreshTokenExpiresAt) {
    throw new AppError("Refresh session is invalid. Please sign in again.", 401);
  }

  if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
    user.refreshTokenHash = undefined;
    user.refreshTokenExpiresAt = undefined;
    await user.save();
    throw new AppError("Refresh session expired. Please sign in again.", 401);
  }

  const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!matches) {
    throw new AppError("Refresh session is invalid. Please sign in again.", 401);
  }

  const tokens = await issueAuthTokens(user, req, payload.sessionId);
  res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = cleanString(req.body.refreshToken, { field: "Refresh token", max: 4096 });

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      const user = await User.findById(payload.userId).select("+refreshTokenHash +refreshTokenExpiresAt");

      if (user?.refreshTokenHash && await bcrypt.compare(refreshToken, user.refreshTokenHash)) {
        user.refreshTokenHash = undefined;
        user.refreshTokenExpiresAt = undefined;
        await user.save();
        if (payload.sessionId) {
          await Session.findOneAndUpdate({ _id: payload.sessionId, userId: user._id }, { $set: { revokedAt: new Date() } });
        }
      }
    } catch {
      // Logout is intentionally idempotent; invalid tokens still clear client state.
    }
  }

  res.status(204).send();
});

export const listSessions = asyncHandler(async (req, res) => {
  await anonymizeOldSessionIps(req.user._id);

  const sessions = await Session.find({
    userId: req.user._id,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).sort({ lastSeenAt: -1, createdAt: -1 });

  res.json({
    sessions: sessions.map((session) => serializeSession(session, req.sessionId)),
  });
});

export const revokeSession = asyncHandler(async (req, res) => {
  const sessionId = cleanString(req.params.sessionId, { required: true, field: "Session ID", max: 80 });

  if (req.sessionId && sessionId === req.sessionId) {
    throw new AppError("Use sign out to end your current session.", 400);
  }

  const session = await Session.findOneAndUpdate(
    { _id: sessionId, userId: req.user._id, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
    { new: true },
  );

  if (!session) {
    throw new AppError("Session not found", 404);
  }

  await logAuthAudit({ req, action: "session.revoked", resourceId: session._id, metadata: { revokedSessionId: String(session._id) } });
  res.status(204).send();
});

export const revokeOtherSessions = asyncHandler(async (req, res) => {
  const result = await Session.updateMany(
    {
      userId: req.user._id,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
      ...(req.sessionId ? { _id: { $ne: req.sessionId } } : {}),
    },
    { $set: { revokedAt: new Date() } },
  );

  await logAuthAudit({ req, action: "session.revoked_others", metadata: { count: result.modifiedCount } });
  res.json({ revokedCount: result.modifiedCount });
});

export const updateSecurityPreferences = asyncHandler(async (req, res) => {
  const storeIpAddresses = Boolean(req.body.storeIpAddresses);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { storeIpAddresses } },
    { new: true, runValidators: true },
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!storeIpAddresses) {
    await Session.updateMany(
      { userId: req.user._id },
      { $unset: { ipAddress: "" }, $set: { ipAddressAnonymized: true } },
    );
  }

  await logAuthAudit({ req, action: "session.ip_storage_preference_changed", metadata: { storeIpAddresses } });
  res.json({ user: serializeUser(user) });
});

export const unlockUser = asyncHandler(async (req, res) => {
  const userId = cleanString(req.body.userId, { required: true, field: "User ID", max: 80 });
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { failedLoginAttempts: 0, lockoutUntil: null } },
    { new: true, runValidators: true },
  ).select("-passwordHash");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({ user: serializeUser(user) });
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
  const { user, company, created } = await findOrCreateGoogleUser(googleProfile, statePayload.plan);
  const callbackUrl = new URL("/oauth/google", env.appUrl);
  let callbackParams: URLSearchParams;

  if (user.mfaEnabled) {
    callbackParams = new URLSearchParams({
      mfaRequired: "true",
      mfaSessionToken: signMfaSessionToken(user),
      returnTo: statePayload.returnTo,
    });
  } else {
    const tokens = await issueAuthTokens(user, req);
    callbackParams = new URLSearchParams({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      session: encodeOAuthSession({
        user: serializeUser(user),
        company,
      }),
      returnTo: statePayload.returnTo,
    });
  }

  callbackUrl.hash = callbackParams.toString();
  res.clearCookie(OAUTH_STATE_COOKIE);
  if (created) {
    await trackActivationEvent({
      req,
      eventName: "user_signed_up",
      userId: user._id,
      companyId: company?._id ?? user.company,
      properties: { plan: statePayload.plan, authMethod: "google" },
    });
  }
  res.redirect(callbackUrl.toString());
});

function serializeUser(user: IUserDocument) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company?._id ?? user.company,
    emailVerifiedAt: user.emailVerifiedAt,
    storeIpAddresses: user.storeIpAddresses !== false,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}

async function issueAuthTokens(user: IUserDocument, req?: Request, existingSessionId?: string) {
  const sessionId = existingSessionId || new Session()._id.toString();
  const accessToken = signAccessToken(user, sessionId);
  const refreshToken = signRefreshToken(user, sessionId);
  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const tokenHash = await bcrypt.hash(accessToken, 12);
  const companyId = user.company?._id ?? user.company;

  await User.findByIdAndUpdate(user._id, {
    refreshTokenHash,
    refreshTokenExpiresAt,
  });

  await Session.findOneAndUpdate(
    { _id: sessionId, userId: user._id },
    {
      $set: {
        companyId,
        tokenHash,
        deviceInfo: req?.get("user-agent") || "Unknown device",
        ipAddress: user.storeIpAddresses === false ? undefined : getRequestIp(req),
        ipAddressAnonymized: false,
        lastSeenAt: new Date(),
        expiresAt: refreshTokenExpiresAt,
      },
      $setOnInsert: {
        userId: user._id,
        createdAt: new Date(),
      },
      $unset: {
        revokedAt: "",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { accessToken, refreshToken };
}

function verifyRefreshToken(refreshToken: string) {
  let payload: RefreshTokenPayload;

  try {
    payload = jwt.verify(refreshToken, env.jwtSecret) as RefreshTokenPayload;
  } catch {
    throw new AppError("Refresh session is invalid or expired. Please sign in again.", 401);
  }

  if (!payload.userId || payload.type !== "refresh") {
    throw new AppError("Refresh session is invalid. Please sign in again.", 401);
  }

  return payload;
}

function serializeSession(session, currentSessionId?: string) {
  return {
    id: String(session._id),
    device: parseDeviceInfo(session.deviceInfo),
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress || "Not stored",
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    isCurrent: currentSessionId ? String(session._id) === currentSessionId : false,
  };
}

function parseDeviceInfo(userAgent = "") {
  const browser = /Edg\//.test(userAgent) ? "Edge" :
    /Chrome\//.test(userAgent) ? "Chrome" :
    /Firefox\//.test(userAgent) ? "Firefox" :
    /Safari\//.test(userAgent) ? "Safari" :
    "Unknown browser";
  const os = /Windows/i.test(userAgent) ? "Windows" :
    /Mac OS X|Macintosh/i.test(userAgent) ? "macOS" :
    /iPhone|iPad/i.test(userAgent) ? "iOS" :
    /Android/i.test(userAgent) ? "Android" :
    /Linux/i.test(userAgent) ? "Linux" :
    "Unknown OS";

  return `${browser} on ${os}`;
}

function getRequestIp(req?: Request) {
  if (!req) return undefined;

  const forwardedFor = req.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || req.ip;
}

async function anonymizeOldSessionIps(userId) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sessions = await Session.find({
    userId,
    createdAt: { $lt: cutoff },
    ipAddress: { $exists: true, $ne: "" },
    ipAddressAnonymized: { $ne: true },
  });

  await Promise.all(sessions.map((session) => {
    session.ipAddress = anonymizeIp(session.ipAddress);
    session.ipAddressAnonymized = true;
    return session.save();
  }));
}

function anonymizeIp(value?: string) {
  if (!value) return value;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    return value.split(".").map((part, index) => index === 3 ? "0" : part).join(".");
  }
  if (value.includes(":")) {
    return `${value.split(":").slice(0, 4).join(":")}::`;
  }
  return "Anonymized";
}

async function logAuthAudit({ req, action, resourceId = req.user?._id, metadata = {} }) {
  if (!req.user || !req.companyId) return;

  await AuditLog.create({
    company: req.companyId,
    actor: req.user._id,
    action,
    resourceType: "auth_session",
    resourceId,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

function signMfaSessionToken(user: IUserDocument) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      type: "mfa",
    },
    env.jwtSecret,
    { expiresIn: MFA_SESSION_EXPIRES_IN } as SignOptions,
  );
}

function verifyMfaSessionToken(mfaSessionToken: string) {
  let payload: MfaSessionPayload;

  try {
    payload = jwt.verify(mfaSessionToken, env.jwtSecret) as MfaSessionPayload;
  } catch {
    throw new AppError("MFA session expired. Please sign in again.", 401);
  }

  if (!payload.userId || payload.type !== "mfa") {
    throw new AppError("MFA session is invalid. Please sign in again.", 401);
  }

  return payload;
}

function ensureMfaEncryptionConfigured() {
  if (!env.mfaEncryptionKey) {
    throw new AppError("MFA encryption is not configured", 503);
  }
}

function getMfaEncryptionKey() {
  ensureMfaEncryptionConfigured();

  const raw = env.mfaEncryptionKey.trim();
  const decoded = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (decoded.length === 32) return decoded;

  throw new AppError("MFA encryption key must be 32 bytes encoded as base64 or hex", 503);
}

function encryptMfaSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMfaEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptMfaSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) {
    throw new AppError("Stored MFA secret is invalid", 500);
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", getMfaEncryptionKey(), Buffer.from(ivValue, "base64"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64")), decipher.final()]).toString("utf8");
}

function verifyTotpCode(code: string, secret: string) {
  return verifySync({ token: normalizeMfaCode(code), secret });
}

function normalizeMfaCode(code: string) {
  return String(code).replace(/\s+/g, "").replace(/-/g, "").toUpperCase();
}

function generateBackupCodes() {
  return Array.from({ length: 10 }, () => {
    const value = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${value.slice(0, 5)}-${value.slice(5)}`;
  });
}

async function findBackupCodeMatch(code: string, hashes: string[]) {
  for (let index = 0; index < hashes.length; index += 1) {
    if (await bcrypt.compare(code, hashes[index])) {
      return index;
    }
  }

  return -1;
}

async function logMfaAudit({ req, user, action, metadata = {} }) {
  // Log all MFA enable, disable, and failure events to the audit log.
  const companyId = req.companyId ?? user.company?._id ?? user.company;
  if (!companyId || !user?._id) return;

  await AuditLog.create({
    company: companyId,
    actor: user._id,
    action,
    resourceType: "auth_mfa",
    resourceId: user._id,
    metadata,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
}

function isUserLocked(user: IUserDocument) {
  return Boolean(user.lockoutUntil && user.lockoutUntil.getTime() > Date.now());
}

async function handleFailedPasswordLogin(user: IUserDocument) {
  if (isUserLocked(user)) {
    return;
  }

  const failedLoginAttempts = Number(user.failedLoginAttempts ?? 0) + 1;

  if (failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
    user.failedLoginAttempts = 0;
    user.lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    await user.save();
    await ActivityLog.create({
      companyId: user.company?._id ?? user.company,
      userId: user._id,
      userEmail: user.email,
      action: "account_locked",
      entityType: "settings",
      entityId: user.company?._id ?? user.company,
      entityName: user.email,
      metadata: {
        reason: "failed_login_attempts",
        lockoutMinutes: LOCKOUT_MINUTES,
        lockedUntil: user.lockoutUntil,
      },
    });
    throw new AppError(`Account temporarily locked. Try again after ${LOCKOUT_MINUTES} minutes.`, 423, {
      lockoutUntil: user.lockoutUntil,
      minutesRemaining: LOCKOUT_MINUTES,
    });
  }

  user.failedLoginAttempts = failedLoginAttempts;
  await user.save();
}

function remainingLoginAttempts(failedLoginAttempts: number) {
  return Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - failedLoginAttempts);
}

function buildIncorrectPasswordMessage(failedLoginAttempts: number) {
  const remaining = remainingLoginAttempts(failedLoginAttempts);
  return `Incorrect password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before lockout.`;
}

function getLockoutMinutesRemaining(lockoutUntil?: Date | null) {
  if (!lockoutUntil) return LOCKOUT_MINUTES;
  return Math.max(1, Math.ceil((lockoutUntil.getTime() - Date.now()) / 60000));
}

async function findOrCreateGoogleUser(profile: GoogleProfile, plan: Plan) {
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

    if (user.authProvider !== "google" && !user.passwordHash) {
      user.authProvider = "google";
      changed = true;
    }

    if (changed) {
      await user.save();
      user = await User.findById(user._id).populate("company");
    }

    return { user, company: user.company, created: false };
  }

  const companyDomain = profile.hd ?? getEmailDomain(profile.email);
  const company = await Company.create({
    name: companyDomain ? `${companyDomain} Workspace` : `${profile.name}'s Workspace`,
    domain: companyDomain,
    plan,
  } as any);

  user = await User.create({
    name: profile.name,
    email: profile.email,
    authProvider: "google",
    googleId: profile.sub,
    company: company._id,
    role: "owner",
    emailVerifiedAt: profile.email_verified ? new Date() : undefined,
    avatarSource: "gravatar",
  });

  company.createdBy = user._id;
  await company.save();
  await seedWorkspaceSamples(company._id);
  await user.populate("company");

  return { user, company, created: true };
}

function ensureGoogleOAuthConfigured() {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new AppError("Google sign-in is not configured yet", 503);
  }
}

function createOAuthState(payload: { returnTo: string; plan: Plan }) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "10m",
    audience: "google-oauth",
    issuer: "autoaudit-api",
  } as SignOptions);
}

function verifyOAuthState(state: string): OAuthStatePayload {
  try {
    const payload = jwt.verify(state, env.jwtSecret, {
      audience: "google-oauth",
      issuer: "autoaudit-api",
    }) as OAuthStatePayload;

    return payload;
  } catch {
    throw new AppError("Google sign-in session expired. Please try again.", 400);
  }
}

function encodeOAuthSession(session: unknown) {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
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

  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.id_token) {
    throw new AppError("Google sign-in could not be completed", 502);
  }

  return data;
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const tokenInfoUrl = new URL(GOOGLE_TOKENINFO_URL);
  tokenInfoUrl.searchParams.set("id_token", idToken);

  const response = await fetch(tokenInfoUrl);
  const profile = (await response.json()) as GoogleTokenInfo;

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

function cleanOAuthReturnTo(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/dashboard";
  }

  if (value.startsWith("//")) {
    return "/dashboard";
  }

  return value.slice(0, 300);
}

function readCookie(req: Request, name: string) {
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

function getEmailDomain(email: string) {
  const domain = email.split("@")[1];
  return domain && !["gmail.com", "googlemail.com"].includes(domain) ? domain : "";
}

function cleanPlan(value: unknown): Plan {
  const allowedPlans = new Set<Plan>(["free", "starter", "standard", "custom"]);

  if (typeof value !== "string") {
    return "free";
  }

  const plan = value.trim().toLowerCase() as Plan;
  return allowedPlans.has(plan) ? plan : "free";
}

async function seedWorkspaceSamples(companyId) {
  try {
    await seedSampleVendors(companyId);
  } catch (error) {
    console.error("Failed to seed sample vendors", error);
  }
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
