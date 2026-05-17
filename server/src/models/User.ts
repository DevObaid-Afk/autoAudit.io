import bcrypt from "bcryptjs";
import mongoose, { type HydratedDocument, type Model, type Types } from "mongoose";

export type UserRole = "owner" | "admin" | "member" | "viewer";

export interface IUser {
  name: string;
  email: string;
  passwordHash?: string;
  authProvider: "password" | "google";
  googleId?: string;
  role: UserRole;
  company: Types.ObjectId;
  emailVerifiedAt?: Date;
  avatarUrl?: string;
  avatarSource: "initials" | "upload" | "ai";
  avatarUpdatedAt?: Date;
  avatarGenerationUsage?: {
    periodStart?: Date;
    count?: number;
  };
  failedLoginAttempts?: number;
  lockoutUntil?: Date | null;
  passwordChangedAt?: Date | null;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
}

export interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
}

export type IUserDocument = HydratedDocument<IUser, IUserMethods>;

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new mongoose.Schema<IUser, UserModel, IUserMethods>(
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
      enum: ["owner", "admin", "member", "viewer"],
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
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
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

userSchema.methods.comparePassword = function comparePassword(password: string) {
  if (!this.passwordHash) {
    return Promise.resolve(false);
  }

  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
