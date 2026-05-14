import mongoose from "mongoose";

export type SavingsType = "cancelled" | "renegotiated" | "seat_reduced" | "other";

const savingsEntrySchema = new mongoose.Schema(
  {
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
    savingsType: {
      type: String,
      enum: ["cancelled", "renegotiated", "seat_reduced", "other"],
      required: true,
    },
    monthlySavings: {
      type: Number,
      required: true,
      min: 0,
    },
    annualSavings: {
      type: Number,
      required: true,
      min: 0,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    confirmedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

savingsEntrySchema.index({ companyId: 1, confirmedAt: -1 });
savingsEntrySchema.index({ companyId: 1, savingsType: 1 });
savingsEntrySchema.index({ companyId: 1, vendorId: 1 });

export type SavingsEntryDocument = mongoose.InferSchemaType<typeof savingsEntrySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SavingsEntry = mongoose.model("SavingsEntry", savingsEntrySchema);
