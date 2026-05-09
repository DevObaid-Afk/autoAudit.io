import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, "Event name is required"],
      trim: true,
      maxlength: 120,
      index: true,
    },
    path: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

analyticsEventSchema.index({ eventName: 1, createdAt: -1 });
analyticsEventSchema.index({ company: 1, createdAt: -1 });

export const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);
