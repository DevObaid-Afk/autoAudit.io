import mongoose from "mongoose";

export type ActionItemStatus = "open" | "in_progress" | "done";
export type ActionItemPriority = "low" | "medium" | "high";

const actionItemSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    detail: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    signalType: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    impact: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "done"],
      default: "open",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

actionItemSchema.index({ companyId: 1, status: 1, createdAt: -1 });
actionItemSchema.index({ companyId: 1, vendorId: 1, title: 1 });

export type ActionItemDocument = mongoose.InferSchemaType<typeof actionItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ActionItem = mongoose.model("ActionItem", actionItemSchema);
