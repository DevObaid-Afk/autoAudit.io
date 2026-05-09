import bcrypt from "bcryptjs";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken } from "../utils/auth.js";
import { cleanString } from "../middleware/validate.js";

export const signup = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, { required: true, field: "Name", max: 120 });
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });
  const companyName = cleanString(req.body.companyName, { required: true, field: "Company name", max: 120 });
  const companyDomain = cleanString(req.body.companyDomain, { field: "Company domain", max: 120 })?.toLowerCase();
  const plan = cleanPlan(req.body.plan);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new AppError("Email must be valid", 400);
  }

  if (password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError("An account already exists for this email", 409);
  }

  const company = await Company.create({
    name: companyName,
    domain: companyDomain,
    plan,
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    passwordHash,
    company: company._id,
    role: "owner",
  });

  company.createdBy = user._id;
  await company.save();

  const token = signAuthToken(user);

  res.status(201).json({
    token,
    user: serializeUser(user),
    company,
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const password = cleanString(req.body.password, { required: true, field: "Password", max: 256 });

  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash").populate("company");

  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = signAuthToken(user);

  res.json({
    token,
    user: serializeUser(user),
    company: user.company,
  });
});

function serializeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company?._id ?? user.company,
  };
}

function cleanPlan(value) {
  const allowedPlans = new Set(["free", "starter", "standard", "custom"]);

  if (typeof value !== "string") {
    return "free";
  }

  const plan = value.trim().toLowerCase();
  return allowedPlans.has(plan) ? plan : "free";
}
