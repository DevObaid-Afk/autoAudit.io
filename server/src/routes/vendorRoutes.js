import { Router } from "express";
import { createVendor, deleteVendor, listVendors, updateVendor } from "../controllers/vendorController.js";

export const vendorRoutes = Router();

vendorRoutes.get("/", listVendors);
vendorRoutes.post("/", createVendor);
vendorRoutes.patch("/:id", updateVendor);
vendorRoutes.delete("/:id", deleteVendor);

