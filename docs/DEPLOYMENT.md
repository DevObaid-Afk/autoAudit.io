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

## Production Checks

- Confirm `GET /health` returns `status: ok`.
- Confirm signup and login work against the deployed API.
- Confirm dashboard requests are not blocked by CORS.
- Confirm rate-limit headers appear on API responses.
- Confirm MongoDB Atlas indexes are built after first boot.
