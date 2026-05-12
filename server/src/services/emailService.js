import { env } from "../config/env.js";

export async function sendContactNotification(request) {
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

export async function sendVerificationEmail({ email, name, token }) {
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

export async function sendPasswordResetEmail({ email, name, token }) {
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

async function sendEmail({ to, subject, text, replyTo }) {
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
