import { env } from "../config/env.js";

type EmailIdentityToken = {
  email: string;
  name?: string;
  token: string;
};

type EmailPayload = {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
};

type RenewalDigestEmail = {
  to: string;
  companyName: string;
  dashboardUrl: string;
  urgent: RenewalDigestVendor[];
  upcoming: RenewalDigestVendor[];
  later: RenewalDigestVendor[];
  totalExposure: number;
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
    to: [env.contactToEmail],
    replyTo: request.email,
    subject,
    text,
  });
}

export async function sendVerificationEmail({ email, name, token }: EmailIdentityToken) {
  const verifyUrl = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: [email],
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

export async function sendPasswordResetEmail({ email, name, token }: EmailIdentityToken) {
  const resetUrl = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const firstName = name?.split(" ")[0] || "there";

  return sendEmail({
    to: [email],
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

export async function sendTeamInviteEmail({ email, role, companyName, inviterName, token }: TeamInviteEmail) {
  const inviteUrl = `${env.appUrl}/dashboard/team?inviteToken=${encodeURIComponent(token)}`;

  return sendEmail({
    to: [email],
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

export async function sendRenewalDigestEmail({ to, companyName, dashboardUrl, urgent, upcoming, later, totalExposure }: RenewalDigestEmail) {
  return sendEmail({
    to: [to],
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

async function sendEmail({ to, subject, text, replyTo }: EmailPayload) {
  if (!env.resendApiKey) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to,
      reply_to: replyTo,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    return { skipped: true, reason: `Email provider returned ${response.status}` };
  }

  return { sent: true };
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
