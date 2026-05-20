import mongoose from "mongoose";

export type EmailLogType = "verification" | "reset" | "digest" | "urgent_renewal" | "invite" | "contact";
export type EmailLogStatus = "sent" | "failed";

const emailLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["verification", "reset", "digest", "urgent_renewal", "invite", "contact"],
      required: true,
      index: true,
    },
    recipientMasked: {
      type: String,
      required: true,
      trim: true,
      maxlength: 254,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
      maxlength: 500,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ companyId: 1, createdAt: -1 });

export type EmailLogDocument = mongoose.InferSchemaType<typeof emailLogSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);
