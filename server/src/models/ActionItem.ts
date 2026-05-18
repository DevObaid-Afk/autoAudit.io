import mongoose, { type Types } from "mongoose";

export type ActionItemStatus = "open" | "in_progress" | "done";
export type ActionItemPriority = "low" | "medium" | "high";
export type ActionItemApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface IActionItemComment {
  author: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IActionItem {
  companyId: Types.ObjectId;
  vendorId?: Types.ObjectId;
  vendorName: string;
  title: string;
  detail?: string;
  signalType?: string;
  impact: number;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  createdBy?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  dueDate?: Date;
  approvalStatus: ActionItemApprovalStatus;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  comments: IActionItemComment[];
  estimatedSavings: number;
  confirmedSavings?: number;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const actionItemCommentSchema = new mongoose.Schema<IActionItemComment>(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { _id: true },
);

const actionItemSchema = new mongoose.Schema<IActionItem>(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    detail: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    signalType: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    impact: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "done"],
      default: "open",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dueDate: {
      type: Date,
    },
    approvalStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    comments: {
      type: [actionItemCommentSchema],
      default: [],
      validate: {
        validator(value: IActionItemComment[]) {
          return value.length <= 100;
        },
        message: "Action items support up to 100 comments",
      },
    },
    estimatedSavings: {
      type: Number,
      default: 0,
      min: 0,
    },
    confirmedSavings: {
      type: Number,
      min: 0,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

actionItemSchema.index({ companyId: 1, status: 1, createdAt: -1 });
actionItemSchema.index({ companyId: 1, vendorId: 1, title: 1 });
actionItemSchema.index({ companyId: 1, assignedTo: 1, status: 1 });
actionItemSchema.index({ companyId: 1, approvalStatus: 1, dueDate: 1 });

export type ActionItemDocument = IActionItem & {
  _id: mongoose.Types.ObjectId;
};

export const ActionItem = mongoose.model<IActionItem>("ActionItem", actionItemSchema);
