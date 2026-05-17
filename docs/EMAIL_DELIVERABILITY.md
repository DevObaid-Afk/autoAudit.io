# AutoAudit.ai Email Deliverability Setup

This guide covers the DNS records and Resend verification steps needed before AutoAudit.ai can reliably send production email from your own domain.

## 1. SPF Record Setup

SPF tells receiving mail servers which services are allowed to send email for your domain.

Add this DNS record:

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `@` or your root domain |
| Value | `"v=spf1 include:resend.com ~all"` |

Add it in your DNS provider dashboard, such as Cloudflare, Namecheap, GoDaddy, or wherever your domain DNS is managed.

The `~all` value means "soft fail" for unlisted senders, so suspicious mail is marked but not strictly rejected. The `-all` value means "hard fail" and tells receivers to reject unlisted senders. Use `~all` for now while the domain is new and you are still monitoring delivery.

## 2. DKIM Record Setup

DKIM cryptographically signs outgoing mail so receiving servers can verify that messages were authorized by your domain.

Go to [https://resend.com/domains](https://resend.com/domains), add your sending domain, and Resend will generate the DKIM CNAME records automatically.

Typical Resend DKIM records look like this:

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `resend._domainkey` |
| Value | `resend._domainkey.resend.com` |

Resend usually provides 3 CNAME records. Add all of them exactly as shown in the Resend dashboard.

## 3. DMARC Record Setup

DMARC tells receiving servers how to handle email that fails SPF or DKIM checks and where to send reports.

Add this DNS record:

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name | `_dmarc` |
| Value | `"v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"` |

The `p=none` policy means monitor-only mode. No email is rejected yet, which is correct for a new domain starting out.

After 30 days of clean DMARC reports, upgrade the policy to `p=quarantine`.

## 4. Domain Verification In Resend

After adding the DNS records, return to the Resend dashboard and verify the domain:

[https://resend.com/domains](https://resend.com/domains)

DNS propagation can take up to 48 hours, although it often completes sooner.

## 5. Testing Deliverability

Use [https://mail-tester.com](https://mail-tester.com) to send a test email and get a deliverability score.

A score of 8/10 or above is acceptable for a new domain.

Also verify the DNS records directly:

- SPF: [https://mxtoolbox.com/spf.aspx](https://mxtoolbox.com/spf.aspx)
- DKIM: [https://mxtoolbox.com/dkim.aspx](https://mxtoolbox.com/dkim.aspx)
