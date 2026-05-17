import mongoose from "mongoose";

export type ActivityEntityType = "vendor" | "report" | "email_draft" | "savings" | "team" | "settings" | "action_item";

const activityLogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    entityType: {
      type: String,
      enum: ["vendor", "report", "email_draft", "savings", "team", "settings", "action_item"],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    entityName: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ companyId: 1, createdAt: -1 });
activityLogSchema.index({ companyId: 1, entityType: 1, createdAt: -1 });

export type ActivityLogDocument = mongoose.InferSchemaType<typeof activityLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
