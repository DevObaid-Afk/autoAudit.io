const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || "exehassan62@gmail.com";

export async function sendContactNotification(request) {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true, reason: "RESEND_API_KEY is not configured" };
  }

  const fromEmail = process.env.EMAIL_FROM || "AutoAudit.ai <onboarding@resend.dev>";
  const subject = `New AutoAudit.ai request from ${request.name}`;
  const text = [
    "New AutoAudit.ai contact request",
    "",
    `Name: ${request.name}`,
    `Email: ${request.email}`,
    `Company: ${request.company || "Not provided"}`,
    `Status: ${request.status}`,
    "",
    "Message:",
    request.message,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [CONTACT_TO_EMAIL],
      reply_to: request.email,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    return { skipped: true, reason: `Email provider returned ${response.status}` };
  }

  return { sent: true };
}
