import mongoose, { type Types } from "mongoose";

export type SavingsSignalType = "zombie" | "unused_seats" | "duplicate_tool" | "negotiated_rate";
export type SavingsStatus = "identified" | "in_progress" | "realized" | "dismissed";

export interface ISavingsEvidence {
  type: string;
  value: string;
}

export interface ISavingsEntry {
  companyId: Types.ObjectId;
  actionItemId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  vendorName: string;
  signalType: SavingsSignalType;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  expectedMonthlySavings?: number;
  realizedMonthlySavings?: number;
  currency: string;
  status: SavingsStatus;
  evidence: ISavingsEvidence[];
  notes?: string;
  dismissalReason?: string;
  realizedAt?: Date;
  createdBy?: Types.ObjectId;
  confirmedBy?: Types.ObjectId;
  nextReviewDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const savingsEvidenceSchema = new mongoose.Schema<ISavingsEvidence>(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false },
);

const savingsEntrySchema = new mongoose.Schema<ISavingsEntry>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    actionItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActionItem",
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    vendorName: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
      maxlength: 140,
    },
    signalType: {
      type: String,
      enum: ["zombie", "unused_seats", "duplicate_tool", "negotiated_rate"],
      required: true,
      index: true,
    },
    estimatedMonthlySavings: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedAnnualSavings: {
      type: Number,
      required: true,
      min: 0,
    },
    expectedMonthlySavings: {
      type: Number,
      min: 0,
    },
    realizedMonthlySavings: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    status: {
      type: String,
      enum: ["identified", "in_progress", "realized", "dismissed"],
      default: "identified",
      index: true,
    },
    evidence: {
      type: [savingsEvidenceSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    dismissalReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    realizedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    nextReviewDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

savingsEntrySchema.index({ companyId: 1, status: 1, createdAt: -1 });
savingsEntrySchema.index({ companyId: 1, realizedAt: -1 });
savingsEntrySchema.index({ companyId: 1, signalType: 1 });
savingsEntrySchema.index({ companyId: 1, vendorId: 1 });
savingsEntrySchema.index({ companyId: 1, actionItemId: 1 });

export type SavingsEntryDocument = mongoose.InferSchemaType<typeof savingsEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SavingsEntry = mongoose.model("SavingsEntry", savingsEntrySchema);
