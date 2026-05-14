import { Router } from "express";
import { listRenewals } from "../controllers/renewalController.js";

export const renewalRoutes = Router();

renewalRoutes.get("/", listRenewals);

