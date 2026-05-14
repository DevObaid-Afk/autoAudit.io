import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
      maxlength: 160,
    },
    type: {
      type: String,
      enum: ["monthly_waste", "renewal_risk", "unused_seats", "custom"],
      default: "monthly_waste",
    },
    periodStart: {
      type: Date,
    },
    periodEnd: {
      type: Date,
    },
    summary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    findings: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    content: {
      type: String,
      trim: true,
      maxlength: 20000,
    },
    status: {
      type: String,
      enum: ["draft", "ready", "archived"],
      default: "ready",
    },
  },
  { timestamps: true },
);

export type ReportDocument = mongoose.InferSchemaType<typeof reportSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Report = mongoose.model("Report", reportSchema);
