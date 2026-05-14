import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
      unique: true,
      match: [/^\S+@\S+\.\S+$/, "Email must be valid"],
    },
    passwordHash: {
      type: String,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ["password", "google"],
      default: "password",
    },
    googleId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "owner",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    emailVerifiedAt: {
      type: Date,
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    avatarSource: {
      type: String,
      enum: ["initials", "upload", "ai"],
      default: "initials",
    },
    avatarUpdatedAt: {
      type: Date,
    },
    avatarGenerationUsage: {
      periodStart: {
        type: Date,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    emailVerificationTokenHash: {
      type: String,
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true },
);

userSchema.index({ company: 1, role: 1 });
userSchema.index({ emailVerificationTokenHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

userSchema.methods.comparePassword = function comparePassword(password) {
  if (!this.passwordHash) {
    return false;
  }

  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model("User", userSchema);
