import bcrypt from "bcryptjs";
import { Company } from "../models/Company.js";
import { User } from "../models/User.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAuthToken } from "../utils/auth.js";

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, companyName, companyDomain } = req.body;

  if (!name || !email || !password || !companyName) {
    throw new AppError("Name, email, password, and companyName are required", 400);
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
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

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

