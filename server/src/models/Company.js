import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: 120,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "growth", "enterprise"],
      default: "starter",
    },
    trackedSpendLimit: {
      type: Number,
      default: 50000,
      min: 0,
    },
    settings: {
      requireCfoApprovalAbove: {
        type: Number,
        default: 5000,
      },
      weeklyRenewalDigest: {
        type: Boolean,
        default: true,
      },
      autoDraftCancellationEmails: {
        type: Boolean,
        default: true,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export const Company = mongoose.model("Company", companySchema);

