import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: 120,
    },
    domain: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 120,
    },
    plan: {
      type: String,
      enum: ["free", "starter", "standard", "growth", "enterprise", "custom"],
      default: "free",
    },
    trialStartedAt: {
      type: Date,
      default: Date.now,
    },
    trialEndsAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    subscriptionStatus: {
      type: String,
      enum: ["trialing", "active", "expired"],
      default: "trialing",
    },
    stripeCustomerId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    stripeSubscriptionId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    planUsage: {
      reportsGenerated: {
        type: Number,
        default: 0,
        min: 0,
      },
      aiEmailsGenerated: {
        type: Number,
        default: 0,
        min: 0,
      },
      vendorAnalysesGenerated: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    trackedSpendLimit: {
      type: Number,
      default: 50000,
      min: 0,
    },
    settings: {
      requireCfoApprovalAbove: {
        type: Number,
        default: 5000,
      },
      weeklyRenewalDigest: {
        type: Boolean,
        default: true,
      },
      autoDraftCancellationEmails: {
        type: Boolean,
        default: true,
      },
      allowManagedRenegotiation: {
        type: Boolean,
        default: false,
      },
    },
    onboarding: {
      addedFirstVendor: {
        type: Boolean,
        default: false,
      },
      importedCsv: {
        type: Boolean,
        default: false,
      },
      reviewedWaste: {
        type: Boolean,
        default: false,
      },
      generatedReport: {
        type: Boolean,
        default: false,
      },
      createdEmailDraft: {
        type: Boolean,
        default: false,
      },
      invitedTeammate: {
        type: Boolean,
        default: false,
      },
      dismissed: {
        type: Boolean,
        default: false,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

companySchema.index({ domain: 1 });
companySchema.index({ createdBy: 1 });

export type CompanyDocument = mongoose.InferSchemaType<typeof companySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Company = mongoose.model("Company", companySchema);
