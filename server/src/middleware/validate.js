import mongoose from "mongoose";
import { AppError } from "../utils/AppError.js";

export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.body = schema(req.body ?? {});
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireObjectId(paramName = "id") {
  return (req, _res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      next(new AppError("Invalid resource id", 400));
      return;
    }

    next();
  };
}

export function cleanString(value, { max = 500, required = false, field = "Value" } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AppError(`${field} is required`, 400);
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AppError(`${field} must be text`, 400);
  }

  const cleaned = value.trim();
  if (required && !cleaned) throw new AppError(`${field} is required`, 400);
  if (cleaned.length > max) throw new AppError(`${field} must be ${max} characters or fewer`, 400);
  return cleaned || undefined;
}

export function cleanNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER, field = "Value" } = {}) {
  if (value === undefined || value === null || value === "") return undefined;

  const number = Number(value);
  if (!Number.isFinite(number)) throw new AppError(`${field} must be a number`, 400);
  if (number < min || number > max) throw new AppError(`${field} must be between ${min} and ${max}`, 400);
  return number;
}

export function cleanDate(value, { field = "Date" } = {}) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${field} must be a valid date`, 400);
  return date;
}

export function cleanEnum(value, values, { field = "Value", defaultValue } = {}) {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (!values.includes(value)) throw new AppError(`${field} is invalid`, 400);
  return value;
}
