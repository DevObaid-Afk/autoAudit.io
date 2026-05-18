import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env.js";
import { handleStripeWebhook } from "./controllers/billingController.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRateLimit } from "./middleware/rateLimit.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use((req, _res, next) => {
    req.id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    next();
  });
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(apiRateLimit);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedCorsOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  app.use(express.json({ limit: "6mb" }));
  app.use("/uploads", express.static(path.resolve("server", "uploads")));

  app.get("/health", healthCheck);
  app.get("/api/health", healthCheck);
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function isAllowedCorsOrigin(origin) {
  if (env.corsOrigins.includes(origin)) {
    return true;
  }

  if (env.nodeEnv !== "production") {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
  }

  return false;
}

function healthCheck(_req, res) {
  res.json({
    status: "ok",
    service: "autoaudit-api",
    timestamp: new Date().toISOString(),
  });
}
