import { ContactRequest } from "../models/ContactRequest.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { cleanString } from "../middleware/validate.js";
import { buildPagination, parsePagination } from "../utils/query.js";
import { sendContactNotification } from "../services/emailService.js";

export const createContactRequest = asyncHandler(async (req, res) => {
  const name = cleanString(req.body.name, { required: true, field: "Name", max: 120 });
  const email = cleanString(req.body.email, { required: true, field: "Email", max: 254 })?.toLowerCase();
  const company = cleanString(req.body.company, { field: "Company", max: 120 });
  const message = cleanString(req.body.message, { required: true, field: "Message", max: 2000 });

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new AppError("Email must be valid", 400);
  }

  const request = await ContactRequest.create({
    name,
    email,
    company,
    message,
    source: "custom_plan",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  sendContactNotification(request).catch(() => undefined);

  res.status(201).json({
    message: "Request received. We will reply by email soon.",
    request: {
      id: request._id,
      status: request.status,
    },
  });
});

export const listContactRequests = asyncHandler(async (req, res) => {
  const allowedEmails = (process.env.CONTACT_ADMIN_EMAILS || "exehassan62@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes(req.user.email.toLowerCase())) {
    throw new AppError("You do not have permission to view contact requests", 403);
  }

  const { page, limit, skip } = parsePagination(req.query);
  const [contactRequests, total] = await Promise.all([
    ContactRequest.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactRequest.countDocuments(),
  ]);

  res.json({
    contactRequests,
    pagination: buildPagination({ page, limit, total }),
  });
});

export const updateContactRequest = asyncHandler(async (req, res) => {
  const allowedEmails = (process.env.CONTACT_ADMIN_EMAILS || "exehassan62@gmail.com")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes(req.user.email.toLowerCase())) {
    throw new AppError("You do not have permission to update contact requests", 403);
  }

  const status = cleanString(req.body.status, { required: true, field: "Status", max: 30 });
  if (!["new", "reviewed", "closed"].includes(status)) {
    throw new AppError("Status must be new, reviewed, or closed", 400);
  }

  const request = await ContactRequest.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!request) {
    throw new AppError("Contact request not found", 404);
  }

  res.json({ contactRequest: request });
});
