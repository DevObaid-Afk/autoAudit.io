import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
      maxlength: 140,
    },
    category: {
      type: String,
      default: "Uncategorized",
      trim: true,
      maxlength: 100,
    },
    ownerName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    monthlySpend: {
      type: Number,
      default: 0,
      min: 0,
    },
    seatsPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
    },
    renewalDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "zombie", "duplicate", "renewal_risk", "unused_seats", "cancelled"],
      default: "active",
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    source: {
      type: String,
      enum: ["manual", "csv", "email", "sso", "bank_feed"],
      default: "manual",
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

vendorSchema.index({ company: 1, name: 1 }, { unique: true });
vendorSchema.index({ company: 1, status: 1, monthlySpend: -1 });
vendorSchema.index({ company: 1, category: 1, monthlySpend: -1 });
vendorSchema.index({ company: 1, renewalDate: 1 });
vendorSchema.index({ name: "text", category: "text", ownerName: "text", ownerEmail: "text" });

export const Vendor = mongoose.model("Vendor", vendorSchema);
