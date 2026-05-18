const DISCLAIMER = "This report was generated from user-provided data. Verify all figures with your accounting system before taking action.";

export async function generateAuditReportPdf(report) {
  const html = renderAuditReportHtml(report);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "24px", right: "24px", bottom: "40px", left: "24px" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export function renderAuditReportHtml(report) {
  const summary = report.summary ?? {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const savingsEntries = Array.isArray(report.savingsData?.entries) ? report.savingsData.entries : [];
  const renewals = Array.isArray(report.renewals) ? report.renewals : [];
  const generatedAt = report.generatedAt ? new Date(report.generatedAt) : new Date();
  const periodLabel = formatPeriod(report.periodStart, report.periodEnd);
  const topRiskAreas = buildTopRiskAreas(summary);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(report.title ?? "AutoAudit Report")}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #172026;
        background: #ffffff;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 12px;
        line-height: 1.55;
      }
      .page { padding: 8px 10px 0; }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        border-bottom: 2px solid #172026;
        padding-bottom: 18px;
      }
      .brand { display: flex; align-items: center; gap: 12px; }
      .logo {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 8px;
        background: #0ea5e9;
        color: #ffffff;
        font-weight: 900;
        letter-spacing: 0;
      }
      .company { font-size: 18px; font-weight: 900; margin: 0; }
      .subtitle { margin: 2px 0 0; color: #53616b; font-weight: 800; }
      .meta { text-align: right; color: #53616b; font-weight: 700; }
      h1 { margin: 26px 0 8px; font-size: 28px; line-height: 1.12; letter-spacing: 0; }
      h2 { margin: 28px 0 10px; font-size: 16px; letter-spacing: 0; }
      p { margin: 0; }
      .summary-text {
        margin-top: 8px;
        color: #53616b;
        white-space: pre-wrap;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-top: 18px;
      }
      .metric {
        border: 1px solid #dce4e8;
        border-radius: 8px;
        padding: 12px;
        background: #f7fafc;
      }
      .metric span { display: block; color: #53616b; font-size: 10px; font-weight: 800; text-transform: uppercase; }
      .metric strong { display: block; margin-top: 6px; font-size: 18px; line-height: 1.15; }
      .risk-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .pill {
        border-radius: 999px;
        background: #e0f2fe;
        color: #075985;
        padding: 5px 9px;
        font-size: 11px;
        font-weight: 900;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        page-break-inside: auto;
      }
      tr { page-break-inside: avoid; page-break-after: auto; }
      th {
        background: #172026;
        color: #ffffff;
        font-size: 10px;
        padding: 9px 8px;
        text-align: left;
        text-transform: uppercase;
      }
      td {
        border-bottom: 1px solid #dce4e8;
        padding: 9px 8px;
        vertical-align: top;
      }
      td.money { white-space: nowrap; font-weight: 900; }
      .muted { color: #53616b; }
      .footer {
        margin-top: 28px;
        border-top: 1px solid #dce4e8;
        padding-top: 12px;
        color: #53616b;
        font-size: 10px;
        font-weight: 700;
      }
      .footer strong { color: #172026; }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <div class="brand">
          <div class="logo">AA</div>
          <div>
            <p class="company">${escapeHtml(report.companyName ?? "Workspace")}</p>
            <p class="subtitle">AutoAudit.ai — SaaS Spend Audit Report</p>
          </div>
        </div>
        <div class="meta">
          <div>Period: ${escapeHtml(periodLabel)}</div>
          <div>Generated: ${escapeHtml(formatDate(generatedAt))}</div>
        </div>
      </header>

      <h1>${escapeHtml(report.title ?? "SaaS Spend Audit Report")}</h1>
      <p class="summary-text">${escapeHtml(report.content ?? "Review SaaS spend, renewal exposure, unused seats, and recommended actions.")}</p>

      <section>
        <h2>Executive Summary</h2>
        <div class="metrics">
          <div class="metric"><span>Total monthly spend</span><strong>${currency(summary.monthlySpend)}</strong></div>
          <div class="metric"><span>Estimated annual savings</span><strong>${currency(summary.estimatedAnnualSavings)}</strong></div>
          <div class="metric"><span>Vendors reviewed</span><strong>${number(summary.vendorCount)}</strong></div>
          <div class="metric"><span>Monthly waste found</span><strong>${currency(summary.monthlyWasteFound)}</strong></div>
        </div>
        <div class="risk-list">
          ${topRiskAreas.map((risk) => `<span class="pill">${escapeHtml(risk)}</span>`).join("") || '<span class="pill">No major risk areas flagged</span>'}
        </div>
      </section>

      <section>
        <h2>Findings</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Signal</th>
              <th>Annual waste</th>
              <th>Evidence</th>
              <th>Recommended action</th>
            </tr>
          </thead>
          <tbody>
            ${findings.length ? findings.map(renderFindingRow).join("") : '<tr><td colspan="5" class="muted">No findings were saved with this report.</td></tr>'}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Savings Ledger</h2>
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Type</th>
              <th>Monthly savings</th>
              <th>Annual savings</th>
              <th>Confirmed</th>
            </tr>
          </thead>
          <tbody>
            ${savingsEntries.length ? savingsEntries.map(renderSavingsRow).join("") : '<tr><td colspan="5" class="muted">No confirmed savings have been recorded yet.</td></tr>'}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Renewal Risk Calendar</h2>
        <table>
          <thead>
            <tr>
              <th>Window</th>
              <th>Vendor</th>
              <th>Renewal date</th>
              <th>Contract value</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            ${renewals.length ? renewals.map(renderRenewalRow).join("") : '<tr><td colspan="5" class="muted">No upcoming renewals in the next 90 days.</td></tr>'}
          </tbody>
        </table>
      </section>

      <footer class="footer">
        <strong>AutoAudit.ai</strong> · ${escapeHtml(DISCLAIMER)}
      </footer>
    </main>
  </body>
</html>`;
}

async function launchBrowser() {
  const [{ default: puppeteer }, chromiumModule] = await Promise.all([
    import("puppeteer-core"),
    import("@sparticuz/chromium").catch(() => null),
  ]);
  const chromium = chromiumModule?.default;
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (chromium ? await chromium.executablePath() : undefined);

  if (!executablePath) {
    throw new Error("PDF generation requires PUPPETEER_EXECUTABLE_PATH or @sparticuz/chromium.");
  }

  return puppeteer.launch({
    args: chromium?.args ?? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1240, height: 1754 },
    executablePath,
    headless: chromium?.headless ?? true,
  });
}

function renderFindingRow(finding) {
  return `<tr>
    <td>${escapeHtml(finding.vendorName ?? finding.vendor ?? finding.category ?? "Multiple vendors")}</td>
    <td>${escapeHtml(formatSignal(finding.type ?? finding.signalType))}</td>
    <td class="money">${currency(finding.annualImpact ?? finding.estimatedWaste ?? finding.annualWaste)}</td>
    <td>${escapeHtml(formatEvidence(finding.evidence))}</td>
    <td>${escapeHtml(finding.recommendation ?? finding.action ?? "Review with the vendor owner.")}</td>
  </tr>`;
}

function renderSavingsRow(entry) {
  return `<tr>
    <td>${escapeHtml(entry.vendorName ?? "Vendor")}</td>
    <td>${escapeHtml(formatSignal(entry.savingsType))}</td>
    <td class="money">${currency(entry.monthlySavings)}</td>
    <td class="money">${currency(entry.annualSavings)}</td>
    <td>${escapeHtml(formatDate(entry.confirmedAt))}</td>
  </tr>`;
}

function renderRenewalRow(renewal) {
  return `<tr>
    <td>${escapeHtml(renewal.window)}</td>
    <td>${escapeHtml(renewal.vendorName ?? renewal.vendor?.name ?? "Vendor")}</td>
    <td>${escapeHtml(formatDate(renewal.renewalDate))}</td>
    <td class="money">${currency(renewal.contractValue)}</td>
    <td>${escapeHtml(formatSignal(renewal.riskLevel))}</td>
  </tr>`;
}

function buildTopRiskAreas(summary) {
  const areas = [];
  if (Number(summary.zombieSubscriptionCount ?? 0) > 0) areas.push(`${summary.zombieSubscriptionCount} zombie subscriptions`);
  if (Number(summary.unusedSeatCount ?? 0) > 0) areas.push(`${summary.unusedSeatCount} unused seats`);
  if (Number(summary.upcomingRenewalCount ?? 0) > 0) areas.push(`${summary.upcomingRenewalCount} upcoming renewals`);
  return areas;
}

function formatPeriod(start, end) {
  if (!start && !end) return "Current audit snapshot";
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return start ? `From ${formatDate(start)}` : `Through ${formatDate(end)}`;
}

function formatEvidence(evidence) {
  if (Array.isArray(evidence) && evidence.length > 0) return evidence.slice(0, 3).join("; ");
  if (typeof evidence === "string") return evidence;
  return "Evidence captured in the source audit data.";
}

function formatSignal(value) {
  return String(value ?? "review")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function number(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}
