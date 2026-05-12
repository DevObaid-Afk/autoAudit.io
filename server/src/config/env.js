import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  appUrl: normalizeUrl(process.env.APP_URL ?? process.env.FRONTEND_URL ?? "http://127.0.0.1:5173"),
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM || "AutoAudit.ai <onboarding@resend.dev>",
  contactToEmail: process.env.CONTACT_TO_EMAIL || "exehassan62@gmail.com",
  sentryDsn: process.env.SENTRY_DSN,
  sentryEnvironment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
  sentryTracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 600),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 20),
  aiRateLimitWindowMs: Number(process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  aiRateLimitMax: Number(process.env.AI_RATE_LIMIT_MAX ?? 20),
  corsOrigins: parseCorsOrigins(
    process.env.CORS_ORIGIN ?? "http://127.0.0.1:5173,http://localhost:5173",
  ),
};

function parseCorsOrigins(value) {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return origin;
      }
    });
}

function normalizeUrl(value) {
  return String(value).replace(/\/$/, "");
}

export function validateEnv() {
  const missing = [];

  if (!env.mongoUri) missing.push("MONGODB_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
