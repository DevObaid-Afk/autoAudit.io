import mongoose, { type Types } from "mongoose";

export type ReportKind = "monthly_waste" | "renewal_risk" | "unused_seats" | "custom";
export type AiReportType = "cfo_summary" | "board_summary" | "owner_action_list" | "full_audit";
export type ReportStatus = "draft" | "ready" | "archived";

export interface IReport {
  company: Types.ObjectId;
  requestedBy: Types.ObjectId;
  title: string;
  type: ReportKind;
  reportType: AiReportType;
  periodStart?: Date;
  periodEnd?: Date;
  summary: Record<string, unknown>;
  findings: Array<Record<string, unknown>>;
  content?: string;
  status: ReportStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const reportSchema = new mongoose.Schema<IReport>(
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
    reportType: {
      type: String,
      enum: ["cfo_summary", "board_summary", "owner_action_list", "full_audit"],
      default: "cfo_summary",
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

export type ReportDocument = IReport & {
  _id: mongoose.Types.ObjectId;
};

export const Report = mongoose.model<IReport>("Report", reportSchema);
