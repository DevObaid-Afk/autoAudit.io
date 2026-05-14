import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      maxlength: 80,
    },
    userAgent: {
      type: String,
      maxlength: 300,
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ company: 1, createdAt: -1 });
auditLogSchema.index({ company: 1, resourceType: 1, createdAt: -1 });

export type AuditLogDocument = mongoose.InferSchemaType<typeof auditLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
