# Deployment

## Frontend on Vercel

1. Import the repository into Vercel.
2. Keep the framework preset as Vite.
3. Use `npm run build` as the build command.
4. Use `dist` as the output directory.
5. Add `VITE_API_URL` with the Render backend URL.
6. Deploy the frontend.

## Backend on Render

1. Create a Render Web Service from the same repository.
2. Set the runtime to Node.
3. Use `npm install && npm run build:api` as the build command.
4. Use `npm run start:api` as the start command.
5. Add the variables from `server/.env.example`.
6. Set `NODE_ENV=production`.
7. Set `MONGODB_URI` to the MongoDB Atlas connection string.
8. Set `CORS_ORIGIN` to the deployed Vercel frontend origin, without a path. For example, use `https://auto-audit-io.vercel.app`, not `https://auto-audit-io.vercel.app/login`.

## Stripe Billing

1. Create recurring monthly prices in Stripe for Starter and Standard.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_STARTER_PRICE_ID`, and `STRIPE_STANDARD_PRICE_ID` on the backend.
3. Add a Stripe webhook endpoint pointing to `https://your-api.example.com/api/billing/webhook`.
4. Listen for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
5. Set `STRIPE_WEBHOOK_SECRET` to the signing secret for that endpoint.
6. Configure the Stripe customer portal before using the dashboard's Manage billing action.

## Production Checks

- Confirm `GET /health` returns `status: ok`.
- Confirm signup and login work against the deployed API.
- Confirm a Stripe test checkout updates the workspace plan after the webhook is received.
- Confirm dashboard requests are not blocked by CORS.
- Confirm rate-limit headers appear on API responses.
- Confirm MongoDB Atlas indexes are built after first boot.
