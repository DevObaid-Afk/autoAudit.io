# AutoAudit.ai

AutoAudit.ai helps finance and operations teams find waste in their SaaS stack before it renews.

## Product Direction

The first version should stay narrow: prove that the product can identify forgotten SaaS spend and turn that insight into a concrete action.

## MVP Scope

- Import SaaS receipts and renewal emails from Gmail or Outlook.
- Upload expense exports from tools like Ramp, Brex, Amex, QuickBooks, or CSV.
- Map vendors to spend, owners, renewal dates, and usage signals.
- Flag zombie subscriptions, unused seats, duplicate tools, and renewal risks.
- Generate a monthly CFO-ready waste report.
- Draft cancellation or renegotiation emails with company context.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts

## First Prototype

Run the local Vite app to review the initial dashboard mockup.

```bash
npm install
npm run dev
```

The prototype uses mock data for now so we can iterate on product flow quickly before choosing the backend, integrations, and data model.

## Current Dashboard Surface

- Overview Dashboard
- Vendors
- Waste Detection
- Renewals
- Reports
- AI Email Generator
- Billing
- Settings

The app includes a sidebar navigation, top navbar, spend summary cards, waste and savings metrics, active vendor tracking, zombie subscription alerts, renewal views, unused seat tables, duplicate tool alerts, Recharts-based charts, responsive layouts, and smooth UI transitions.

## Suggested Build Order

1. Lock the dashboard workflow and visual language.
2. Add CSV upload and local parsing for expense data.
3. Add vendor detection and normalization.
4. Add email import for invoices and renewal notices.
5. Add usage signals from Google Workspace or Okta.
6. Add billing, saved reports, and account management.
