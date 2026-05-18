import mongoose from "mongoose";

const auditSummaryCacheSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
      index: true,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    computedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isStale: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

export type AuditSummaryCacheDocument = mongoose.InferSchemaType<typeof auditSummaryCacheSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditSummaryCache = mongoose.model("AuditSummaryCache", auditSummaryCacheSchema);
