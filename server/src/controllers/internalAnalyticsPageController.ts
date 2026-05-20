import type { Request, Response } from "express";
import { env } from "../config/env.js";

export function renderInternalAnalyticsPage(req: Request, res: Response) {
  const token = String(req.query.token ?? "");

  if (!env.internalAnalyticsToken || token !== env.internalAnalyticsToken) {
    res.status(401).type("html").send("<!doctype html><title>Unauthorized</title><h1>Unauthorized</h1>");
    return;
  }

  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
  );
  res.type("html").send(buildAnalyticsHtml(token));
}

function buildAnalyticsHtml(token: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AutoAudit.ai Internal Analytics</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18212f; background: #f5f7fa; }
    body { margin: 0; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 48px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 26px; line-height: 1.2; }
    select { min-width: 160px; border: 1px solid #cfd7e6; border-radius: 6px; padding: 10px 12px; background: #fff; color: #18212f; font: inherit; }
    .metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
    .metric, .panel { background: #fff; border: 1px solid #dce3ee; border-radius: 8px; box-shadow: 0 1px 2px rgba(24, 33, 47, 0.04); }
    .metric { padding: 16px; }
    .label { color: #5c697d; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .value { margin-top: 6px; font-size: 26px; font-weight: 750; }
    .panel { padding: 18px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 18px; align-items: start; }
    .retention { display: grid; gap: 12px; }
    .retention-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #edf1f6; }
    .retention-row:last-child { border-bottom: 0; }
    .muted { color: #6b7585; font-size: 13px; }
    .error { display: none; margin-bottom: 16px; padding: 12px 14px; color: #7f1d1d; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; }
    @media (max-width: 900px) { .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>Internal Analytics</h1>
        <div class="muted" id="rangeLabel">Loading funnel data</div>
      </div>
      <select id="range">
        <option value="7d">Last 7 days</option>
        <option value="30d" selected>Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="all">All time</option>
      </select>
    </header>
    <div class="error" id="error"></div>
    <section class="metrics">
      <div class="metric"><div class="label">Signups</div><div class="value" id="signups">0</div></div>
      <div class="metric"><div class="label">Paying</div><div class="value" id="paying">0</div></div>
      <div class="metric"><div class="label">MRR</div><div class="value" id="mrr">$0</div></div>
      <div class="metric"><div class="label">Week 1</div><div class="value" id="week1">0%</div></div>
      <div class="metric"><div class="label">Week 2</div><div class="value" id="week2">0%</div></div>
      <div class="metric"><div class="label">Week 4</div><div class="value" id="week4">0%</div></div>
    </section>
    <section class="grid">
      <div class="panel"><canvas id="funnelChart" height="320"></canvas></div>
      <div class="panel">
        <h2>Retention Detail</h2>
        <div class="retention" id="retentionDetail"></div>
      </div>
    </section>
  </main>
  <script>
    const token = ${JSON.stringify(token)};
    const rangeSelect = document.getElementById("range");
    let chart;

    rangeSelect.addEventListener("change", () => loadAnalytics(rangeSelect.value));
    loadAnalytics(rangeSelect.value);

    async function loadAnalytics(range) {
      const error = document.getElementById("error");
      error.style.display = "none";
      const response = await fetch("/api/admin/funnel?range=" + encodeURIComponent(range) + "&token=" + encodeURIComponent(token));
      if (!response.ok) {
        error.textContent = "Could not load analytics. Check INTERNAL_ANALYTICS_TOKEN and server logs.";
        error.style.display = "block";
        return;
      }
      render(await response.json());
    }

    function render(data) {
      document.getElementById("rangeLabel").textContent = formatDate(data.range.startDate) + " to " + formatDate(data.range.endDate);
      document.getElementById("signups").textContent = data.totals.signups.toLocaleString();
      document.getElementById("paying").textContent = data.totals.paying.toLocaleString();
      document.getElementById("mrr").textContent = currency(data.totals.mrr);
      document.getElementById("week1").textContent = percent(data.retention.week1.percent);
      document.getElementById("week2").textContent = percent(data.retention.week2.percent);
      document.getElementById("week4").textContent = percent(data.retention.week4.percent);
      document.getElementById("retentionDetail").innerHTML = ["week1", "week2", "week4"].map((key) => {
        const label = key.replace("week", "Week ");
        const item = data.retention[key];
        return '<div class="retention-row"><div><strong>' + label + '</strong><div class="muted">' + item.retained + ' retained of ' + item.eligible + ' eligible</div></div><strong>' + percent(item.percent) + '</strong></div>';
      }).join("");

      const labels = data.funnel.map((step) => step.label);
      const counts = data.funnel.map((step) => step.count);
      const percents = data.funnel.map((step) => step.percent);
      if (chart) chart.destroy();
      chart = new Chart(document.getElementById("funnelChart"), {
        type: "bar",
        data: { labels, datasets: [{ label: "Users", data: counts, backgroundColor: "#176b87", borderRadius: 4 }] },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { afterLabel: (ctx) => percents[ctx.dataIndex] + "% of signups" } }
          },
          scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { ticks: { color: "#263244" } } }
        }
      });
    }

    function percent(value) { return Number(value || 0).toFixed(1).replace(".0", "") + "%"; }
    function currency(value) { return "$" + Math.round(Number(value || 0)).toLocaleString(); }
    function formatDate(value) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
  </script>
</body>
</html>`;
}
