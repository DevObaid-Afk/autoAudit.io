import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { aiRoutes } from "./aiRoutes.js";
import { auditRoutes } from "./auditRoutes.js";
import { authRoutes } from "./authRoutes.js";
import { profileRoutes } from "./profileRoutes.js";
import { renewalRoutes } from "./renewalRoutes.js";
import { reportRoutes } from "./reportRoutes.js";
import { subscriptionRoutes } from "./subscriptionRoutes.js";
import { vendorRoutes } from "./vendorRoutes.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/profile", requireAuth, profileRoutes);
apiRouter.use("/vendors", requireAuth, vendorRoutes);
apiRouter.use("/subscriptions", requireAuth, subscriptionRoutes);
apiRouter.use("/audit", requireAuth, auditRoutes);
apiRouter.use("/renewals", requireAuth, renewalRoutes);
apiRouter.use("/reports", requireAuth, reportRoutes);
apiRouter.use("/ai", requireAuth, aiRoutes);

