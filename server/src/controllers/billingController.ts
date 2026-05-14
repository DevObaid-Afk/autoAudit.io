import { env } from "../config/env.js";
import { Company } from "../models/Company.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const STRIPE_API_VERSION = "2026-02-25.clover";

const priceIdsByPlan = {
  starter: () => env.stripeStarterPriceId,
  standard: () => env.stripeStandardPriceId,
};

type BillingPlan = keyof typeof priceIdsByPlan;

type StripeCustomerResponse = {
  id: string;
};

type StripeCheckoutSessionResponse = {
  url: string;
};

type StripeErrorResponse = {
  error?: {
    message?: string;
  };
};

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const plan = cleanBillingPlan(req.body.plan);
  const priceId = priceIdsByPlan[plan]?.();

  if (!env.stripeSecretKey || !priceId) {
    throw new AppError("Stripe billing is not configured yet. Request manual activation for now.", 503);
  }

  const company = await Company.findById(req.companyId);
  if (!company) {
    throw new AppError("Workspace not found", 404);
  }

  const customerId = company.stripeCustomerId || await createStripeCustomer({ company, user: req.user });
  if (!company.stripeCustomerId) {
    company.stripeCustomerId = customerId;
    await company.save();
  }

  const session = await createStripeCheckoutSession({
    customerId,
    priceId,
    plan,
    companyId: String(company._id),
  });

  res.json({ url: session.url });
});

function cleanBillingPlan(value: unknown): BillingPlan {
  if (value === "starter" || value === "standard") {
    return value;
  }

  throw new AppError("Choose Starter or Standard to start checkout", 400);
}

async function createStripeCustomer({ company, user }: { company: any; user: any }) {
  const customer = await stripeRequest<StripeCustomerResponse>("/v1/customers", {
    name: company.name,
    email: user.email,
    metadata: {
      companyId: String(company._id),
      userId: String(user._id),
    },
  });

  return customer.id;
}

async function createStripeCheckoutSession({ customerId, priceId, plan, companyId }: { customerId: string; priceId: string; plan: BillingPlan; companyId: string }) {
  return stripeRequest<StripeCheckoutSessionResponse>("/v1/checkout/sessions", {
    mode: "subscription",
    customer: customerId,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url: `${env.appUrl}/dashboard/billing?checkout=success&plan=${plan}`,
    cancel_url: `${env.appUrl}/dashboard/billing?checkout=cancelled`,
    client_reference_id: companyId,
    "metadata[companyId]": companyId,
    "metadata[plan]": plan,
    "subscription_data[metadata][companyId]": companyId,
    "subscription_data[metadata][plan]": plan,
  });
}

async function stripeRequest<TResponse extends object>(path: string, fields: Record<string, unknown>): Promise<TResponse> {
  const body = new URLSearchParams();

  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, String(value));
    }
  });

  const response = await fetch(`https://api.stripe.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": STRIPE_API_VERSION,
    },
    body,
  });

  const data = (await response.json()) as TResponse & StripeErrorResponse;

  if (!response.ok) {
    throw new AppError(data.error?.message || "Stripe request failed", response.status);
  }

  return data;
}
