import mongoose from "mongoose";

const renewalSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },
    renewalDate: {
      type: Date,
      required: [true, "Renewal date is required"],
      index: true,
    },
    noticeDeadline: {
      type: Date,
    },
    contractValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["upcoming", "in_review", "negotiating", "cancelled", "renewed"],
      default: "upcoming",
    },
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    recommendation: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

renewalSchema.index({ company: 1, status: 1, renewalDate: 1 });
renewalSchema.index({ company: 1, riskLevel: 1, renewalDate: 1 });

export type RenewalDocument = mongoose.InferSchemaType<typeof renewalSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Renewal = mongoose.model("Renewal", renewalSchema);
