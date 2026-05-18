import mongoose, { type Types } from "mongoose";

export type VendorStatus = "active" | "zombie" | "duplicate" | "renewal_risk" | "unused_seats" | "cancelled";
export type VendorSource = "manual" | "csv" | "email" | "sso" | "bank_feed" | "sample";

export interface IVendor {
  company: Types.ObjectId;
  name: string;
  category: string;
  ownerName?: string;
  ownerEmail?: string;
  monthlySpend: number;
  seatsPurchased: number;
  activeSeats: number;
  lastUsedAt?: Date;
  renewalDate?: Date;
  status: VendorStatus;
  riskScore: number;
  source: VendorSource;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const vendorSchema = new mongoose.Schema<IVendor>(
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
      enum: ["manual", "csv", "email", "sso", "bank_feed", "sample"],
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

export type VendorDocument = IVendor & {
  _id: mongoose.Types.ObjectId;
};

export const Vendor = mongoose.model<IVendor>("Vendor", vendorSchema);
