import Stripe from "stripe";
import { env } from "../config/env.js";
import { Company } from "../models/Company.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { trackActivationEvent } from "../services/activationAnalytics.js";

const STRIPE_API_VERSION = "2026-02-25.clover";

const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, { apiVersion: STRIPE_API_VERSION as any })
  : null;

const priceIdsByPlan = {
  starter: () => env.stripeStarterPriceId,
  standard: () => env.stripeStandardPriceId,
};

type BillingPlan = keyof typeof priceIdsByPlan;

export const createCheckoutSession = asyncHandler(async (req, res) => {
  const stripeClient = requireStripe();
  const plan = cleanBillingPlan(req.body.plan);
  const priceId = priceIdsByPlan[plan]?.();

  if (!priceId) {
    throw new AppError("Stripe billing is not configured yet. Request manual activation for now.", 503);
  }

  const company = await Company.findById(req.companyId);
  if (!company) {
    throw new AppError("Workspace not found", 404);
  }

  let customerId = company.stripeCustomerId;
  if (!customerId) {
    const customer = await stripeClient.customers.create({
      name: company.name,
      email: req.user.email,
      metadata: {
        companyId: String(company._id),
        userId: String(req.user._id),
      },
    });

    customerId = customer.id;
    company.stripeCustomerId = customerId;
    await company.save();
  }

  const session = await stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: String(company._id),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.appUrl}/dashboard/billing?checkout=success&plan=${plan}`,
    cancel_url: `${env.appUrl}/dashboard/billing?checkout=cancelled`,
    metadata: {
      companyId: String(company._id),
      userId: String(req.user._id),
      plan,
    },
    subscription_data: {
      metadata: {
        companyId: String(company._id),
        userId: String(req.user._id),
        plan,
      },
    },
  });

  if (!session.url) {
    throw new AppError("Stripe did not return a checkout URL", 502);
  }
  await trackActivationEvent({
    req,
    eventName: "checkout_started",
    properties: { plan },
  });
  if (company.plan !== plan) {
    await trackActivationEvent({
      req,
      eventName: "upgrade_requested",
      properties: { fromPlan: company.plan, toPlan: plan },
    });
  }

  res.json({ url: session.url });
});

export const createBillingPortalSession = asyncHandler(async (req, res) => {
  const stripeClient = requireStripe();
  const company = await Company.findById(req.companyId);

  if (!company) {
    throw new AppError("Workspace not found", 404);
  }

  if (!company.stripeCustomerId) {
    throw new AppError("No active Stripe billing is connected to this workspace yet.", 400);
  }

  // Configure the Stripe Customer Portal in the Stripe Dashboard before enabling this:
  // allow invoice history, payment method updates, subscription cancellation,
  // and plan changes between the Starter and Standard recurring prices.
  const session = await stripeClient.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${env.appUrl}/dashboard`,
  });

  res.json({ url: session.url });
});

export const handleStripeWebhook = asyncHandler(async (req, res) => {
  const stripeClient = requireStripe();

  if (!env.stripeWebhookSecret) {
    throw new AppError("Stripe webhook signing secret is not configured", 503);
  }

  const signature = req.get("stripe-signature");
  if (!signature) {
    throw new AppError("Stripe signature is required", 400);
  }

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch {
    throw new AppError("Invalid Stripe webhook signature", 400);
  }

  if (event.type === "checkout.session.completed") {
    await syncCheckoutSession(event.data.object as Stripe.Checkout.Session);
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await syncSubscription(event.data.object as Stripe.Subscription);
  }

  if (event.type === "customer.subscription.deleted") {
    await expireSubscription(event.data.object as Stripe.Subscription);
  }

  res.json({ received: true });
});

function cleanBillingPlan(value: unknown): BillingPlan {
  if (value === "starter" || value === "standard") {
    return value;
  }

  throw new AppError("Choose Starter or Standard to start checkout", 400);
}

function requireStripe() {
  if (!stripe) {
    throw new AppError("Stripe billing is not configured yet. Request manual activation for now.", 503);
  }

  return stripe;
}

async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.companyId || session.client_reference_id;
  const plan = cleanWebhookPlan(session.metadata?.plan);
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  if (!companyId || !plan) return;

  await Company.findByIdAndUpdate(companyId, {
    plan,
    subscriptionStatus: "active",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
  });
  await trackActivationEvent({
    eventName: "checkout_completed",
    userId: session.metadata?.userId,
    companyId,
    properties: {
      plan,
      amount: Number(session.amount_total ?? 0) / 100,
    },
  });
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  const plan = cleanWebhookPlan(subscription.metadata?.plan) || planFromPriceId(subscription.items.data[0]?.price?.id);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

  if (!companyId || !plan) return;

  await Company.findByIdAndUpdate(companyId, {
    plan,
    subscriptionStatus: subscription.status === "active" || subscription.status === "trialing" ? "active" : "expired",
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
  });
}

async function expireSubscription(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;

  if (!companyId) return;

  await Company.findByIdAndUpdate(companyId, {
    subscriptionStatus: "expired",
    stripeSubscriptionId: subscription.id,
  });
}

function cleanWebhookPlan(value: unknown): BillingPlan | null {
  return value === "starter" || value === "standard" ? value : null;
}

function planFromPriceId(priceId?: string): BillingPlan | null {
  if (priceId && priceId === env.stripeStarterPriceId) return "starter";
  if (priceId && priceId === env.stripeStandardPriceId) return "standard";
  return null;
}
