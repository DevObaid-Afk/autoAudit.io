import mongoose from "mongoose";
import { type UserRole } from "./User.js";

export type InviteRole = Extract<UserRole, "viewer" | "member" | "admin">;

const teamInviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Invite email is required"],
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^\S+@\S+\.\S+$/, "Invite email must be valid"],
    },
    role: {
      type: String,
      enum: ["viewer", "member", "admin"],
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    acceptedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

teamInviteSchema.index({ companyId: 1, email: 1, acceptedAt: 1 });
teamInviteSchema.index({ companyId: 1, createdAt: -1 });

export type TeamInviteDocument = mongoose.InferSchemaType<typeof teamInviteSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const TeamInvite = mongoose.model("TeamInvite", teamInviteSchema);
