import { env } from "../config/env.js";
import { captureException } from "../config/sentry.js";
import { EmailLog, type EmailLogType } from "../models/EmailLog.js";

type EmailIdentityToken = {
  email: string;
  name?: string;
  token: string;
  companyId?: unknown;
};

type EmailPayload = {
  type: EmailLogType;
  to: string[];
  subject: string;
  text: string;
  companyId?: unknown;
};

type RenewalDigestEmail = {
  to: string;
  companyName: string;
  dashboardUrl: string;
  urgent: RenewalDigestVendor[];
  upcoming: RenewalDigestVendor[];
  later: RenewalDigestVendor[];
  totalExposure: number;
  companyId?: unknown;
};

type RenewalDigestVendor = {
  name: string;
  renewalDate: Date;
  ownerName?: string;
  monthlySpend: number;
};

type TeamInviteEmail = {
  email: string;
  role: string;
  companyName: string;
  inviterName: string;
  token: string;
  companyId?: unknown;
};

export async function sendContactNotification(request: Record<string, any>) {
  const subject = `New AutoAudit.ai request from ${request.name}`;
  const text = [
    "New AutoAudit.ai contact request",
    "",
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Company: ${request.company || "Not provided"}`,
    `Source: ${request.source || "contact"}`,
    `Requested plan: ${request.requestedPlan || "Not provided"}`,
    `Status: ${request.status}`,
    "",
    "Message:",
    request.message,
  ].join("\n");

  return sendEmail({
    type: "contact",
    to: [env.contactToEmail],
    subject,
    text,
  });
}

export async function sendVerificationEmail({ email, name, token, companyId }: EmailIdentityToken) {
  const verifyUrl = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    type: "verification",
    to: [email],
    companyId,
    subject: "Verify your AutoAudit.ai email",
    text: [
      `Hi ${firstName},`,
      "",
      "Verify your email address to keep your AutoAudit.ai workspace secure.",
      "",
      verifyUrl,
      "",
      "This link expires in 24 hours. AutoAudit.ai will never ask for your password by email.",
      "",
      "AutoAudit.ai",
    ].join("\n"),
  });
}

export async function sendPasswordResetEmail({ email, name, token, companyId }: EmailIdentityToken) {
  const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    type: "reset",
    to: [email],
    companyId,
    subject: "Reset your AutoAudit.ai password",
    text: [
      `Hi ${firstName},`,
      "",
      "We received a request to reset your AutoAudit.ai password.",
      "",
      resetUrl,
      "",
      "This link expires in 30 minutes. If you did not request this, you can ignore this email.",
      "",
      "AutoAudit.ai",
    ].join("\n"),
  });
}

export async function sendTeamInviteEmail({ email, role, companyName, inviterName, token, companyId }: TeamInviteEmail) {
  const inviteUrl = `${env.appUrl}/dashboard/team?inviteToken=${encodeURIComponent(token)}`;

  return sendEmail({
    type: "invite",
    to: [email],
    companyId,
    subject: `You're invited to AutoAudit.ai`,
    text: [
      `Hi there,`,
      "",
      `${inviterName} invited you to join ${companyName} on AutoAudit.ai as ${role}.`,
      "",
      "Sign in with this email address, then open the invite link below:",
      "",
      inviteUrl,
      "",
      "This invite expires in 7 days.",
      "",
      "AutoAudit.ai",
    ].join("\n"),
  });
}

export async function sendRenewalDigestEmail({ to, companyName, dashboardUrl, urgent, upcoming, later, totalExposure, companyId }: RenewalDigestEmail) {
  return sendEmail({
    type: "digest",
    to: [to],
    companyId,
    subject: "AutoAudit.ai — Your weekly renewal digest",
    text: [
      `Weekly renewal digest for ${companyName}`,
      "",
      `Total renewal exposure: ${formatCurrency(totalExposure)}`,
      "",
      "Renewing in the next 7 days",
      formatDigestSection(urgent),
      "",
      "Renewing in 8-14 days",
      formatDigestSection(upcoming),
      "",
      "Renewing in 15-30 days",
      formatDigestSection(later),
      "",
      "Open your renewals dashboard:",
      dashboardUrl,
      "",
      "AutoAudit.ai",
    ].join("\n"),
  });
}

async function sendEmail({ type, to, subject, text, companyId }: EmailPayload) {
  const recipientMasked = maskEmail(to[0]);

  if (!env.resendApiKey) {
    const reason = "RESEND_API_KEY is not configured";
    await recordEmailLog({ type, recipientMasked, status: "failed", errorMessage: reason, companyId });
    return { skipped: true, reason };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: buildFromAddress(),
        to,
        reply_to: buildReplyToAddress(),
        subject,
        text,
        headers: {
          "X-Mailer": "AutoAudit.ai",
        },
      }),
    });

    if (!response.ok) {
      const reason = `Email provider returned ${response.status}`;
      captureEmailFailure(new Error(reason), { type, recipientMasked });
      await recordEmailLog({ type, recipientMasked, status: "failed", errorMessage: reason, companyId });
      return { skipped: true, reason };
    }

    await recordEmailLog({ type, recipientMasked, status: "sent", errorMessage: null, companyId });
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email provider request failed";
    captureEmailFailure(error, { type, recipientMasked });
    await recordEmailLog({ type, recipientMasked, status: "failed", errorMessage: reason, companyId });
    return { skipped: true, reason };
  }
}

function formatDigestSection(vendors: RenewalDigestVendor[]) {
  if (vendors.length === 0) {
    return "No vendors in this window.";
  }

  return vendors
    .map((vendor) => {
      const owner = vendor.ownerName ? ` | Owner: ${vendor.ownerName}` : "";
      return `- ${vendor.name} | ${formatDate(vendor.renewalDate)} | ${formatCurrency(vendor.monthlySpend)}${owner}`;
    })
    .join("\n");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function parseEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

function getEmailDomain() {
  const address = parseEmailAddress(env.emailFrom);
  return address.split("@")[1] || "resend.dev";
}

function buildFromAddress() {
  const domain = getEmailDomain();
  return `AutoAudit.ai <noreply@${domain}>`;
}

function buildReplyToAddress() {
  return `support@${getEmailDomain()}`;
}

function maskEmail(email = "") {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 3)}***@${domain}`;
}

function captureEmailFailure(error: unknown, { type, recipientMasked }: { type: EmailLogType; recipientMasked: string }) {
  captureException(error, {
    emailType: type,
    recipientMasked,
    timestamp: new Date().toISOString(),
  });
}

async function recordEmailLog({
  type,
  recipientMasked,
  status,
  errorMessage,
  companyId,
}: {
  type: EmailLogType;
  recipientMasked: string;
  status: "sent" | "failed";
  errorMessage: string | null;
  companyId?: unknown;
}) {
  try {
    await EmailLog.create({
      type,
      recipientMasked,
      status,
      errorMessage,
      companyId: (companyId || undefined) as any,
    });
  } catch (error) {
    captureException(error, {
      emailType: type,
      recipientMasked,
      status,
      timestamp: new Date().toISOString(),
      reason: "email_log_write_failed",
    });
  }
}
