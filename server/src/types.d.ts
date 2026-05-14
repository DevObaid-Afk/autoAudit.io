import type { Types } from "mongoose";
import type { IUserDocument } from "./models/User.js";

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: IUserDocument;
      companyId?: Types.ObjectId | string;
    }
  }
}

export {};
