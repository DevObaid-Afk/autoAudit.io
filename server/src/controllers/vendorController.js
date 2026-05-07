import { Vendor } from "../models/Vendor.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { classifyVendorWaste } from "../services/wasteDetection.js";

export const listVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({ company: req.companyId }).sort({ monthlySpend: -1, name: 1 });

  res.json({ vendors });
});

export const createVendor = asyncHandler(async (req, res) => {
  const classification = classifyVendorWaste(req.body);
  const vendor = await Vendor.create({
    ...req.body,
    ...classification,
    company: req.companyId,
  });

  res.status(201).json({ vendor });
});

export const updateVendor = asyncHandler(async (req, res) => {
  const existingVendor = await Vendor.findOne({ _id: req.params.id, company: req.companyId });

  if (!existingVendor) {
    res.status(404).json({ error: { message: "Vendor not found" } });
    return;
  }

  const update = { ...req.body };
  const mergedVendor = { ...existingVendor.toObject(), ...update };
  const classification = classifyVendorWaste(mergedVendor);

  const vendor = await Vendor.findOneAndUpdate(
    { _id: req.params.id, company: req.companyId },
    { ...update, ...classification },
    { new: true, runValidators: true },
  );

  res.json({ vendor });
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, company: req.companyId });

  if (!vendor) {
    res.status(404).json({ error: { message: "Vendor not found" } });
    return;
  }

  res.status(204).send();
});
