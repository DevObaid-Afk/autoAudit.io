# Architecture

AutoAudit.ai is a single-repository MVP with a Vite frontend and Express API.

## Frontend

- Public pages: login and signup.
- Protected pages: dashboard routes.
- Auth state is stored by `AuthContext` and backed by a JWT in local storage.
- API calls are centralized in `src/api/services.ts`.
- Dashboard pages use live API data from the Express backend.

## Backend

- `server/src/app.js` wires security middleware, CORS, rate limits, routes, and error handling.
- Controllers keep request behavior close to route ownership.
- Mongoose models define validation and indexes.
- Shared middleware handles auth, role checks, validation, and rate limiting.
- Audit logs are recorded for write actions.

## Data Model

Core collections:

- Company
- User
- Vendor
- Subscription
- Renewal
- Report
- AuditLog

Every workspace-scoped collection carries a `company` reference so queries remain tenant-aware.
