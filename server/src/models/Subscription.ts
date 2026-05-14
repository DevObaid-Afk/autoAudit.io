import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
      maxlength: 140,
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "annual", "quarterly"],
      default: "monthly",
    },
    cost: {
      type: Number,
      required: [true, "Subscription cost is required"],
      min: 0,
    },
    seatsPurchased: {
      type: Number,
      default: 0,
      min: 0,
    },
    activeSeats: {
      type: Number,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
    },
    renewalDate: {
      type: Date,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentSource: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "paused"],
      default: "active",
    },
  },
  { timestamps: true },
);

subscriptionSchema.index({ company: 1, status: 1, renewalDate: 1 });
subscriptionSchema.index({ company: 1, vendor: 1, status: 1 });

export type SubscriptionDocument = mongoose.InferSchemaType<typeof subscriptionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
