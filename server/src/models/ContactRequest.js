import mongoose from "mongoose";

const contactRequestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    company: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: 2000,
    },
    source: {
      type: String,
      enum: ["contact", "custom_plan", "upgrade_request"],
      default: "custom_plan",
    },
    requestedPlan: {
      type: String,
      enum: ["starter", "standard", "custom", ""],
      default: "",
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "reviewed", "closed"],
      default: "new",
      index: true,
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

contactRequestSchema.index({ createdAt: -1 });
contactRequestSchema.index({ email: 1, createdAt: -1 });

export const ContactRequest = mongoose.model("ContactRequest", contactRequestSchema);
