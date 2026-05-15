import { Router } from "express";
import { createVendor, deleteVendor, importVendors, listVendors, updateVendor } from "../controllers/vendorController.js";
import { requireMinimumRole } from "../middleware/roles.js";
import { requireObjectId } from "../middleware/validate.js";

export const vendorRoutes = Router();

vendorRoutes.get("/", listVendors);
vendorRoutes.post("/", requireMinimumRole("admin"), createVendor);
vendorRoutes.post("/import", requireMinimumRole("admin"), importVendors);
vendorRoutes.patch("/:id", requireObjectId("id"), requireMinimumRole("admin"), updateVendor);
vendorRoutes.delete("/:id", requireObjectId("id"), requireMinimumRole("owner"), deleteVendor);
