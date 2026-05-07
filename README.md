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
- Node.js
- Express
- MongoDB
- Mongoose
- JWT auth

## First Prototype

Run the local Vite app to review the initial dashboard mockup.

```bash
npm install
npm run dev
```

The prototype uses mock data for now so we can iterate on product flow quickly before choosing the backend, integrations, and data model.

## Backend Setup

Create a local `.env` from `.env.example`, then start MongoDB and run the API.

```bash
npm run dev:api
```

The API defaults to `http://127.0.0.1:5000`.

Required environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN`
- `VITE_API_URL`

For local frontend-to-backend calls:

```env
VITE_API_URL=http://127.0.0.1:5000
```

## API Routes

- `GET /health`
- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/profile/me`
- `GET /api/vendors`
- `POST /api/vendors`
- `PATCH /api/vendors/:id`
- `DELETE /api/vendors/:id`
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `GET /api/audit/summary`
- `GET /api/renewals`
- `POST /api/reports/generate`
- `POST /api/ai/cancel-email`

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

The frontend now uses Axios and React Router with protected dashboard routes. Login and signup call the backend auth endpoints, store the JWT for authenticated API calls, and fetch vendors, audit summary, and renewals from the Express API.

## Suggested Build Order

1. Lock the dashboard workflow and visual language.
2. Add CSV upload and local parsing for expense data.
3. Add vendor detection and normalization.
4. Add email import for invoices and renewal notices.
5. Add usage signals from Google Workspace or Okta.
6. Add billing, saved reports, and account management.
