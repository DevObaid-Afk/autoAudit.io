# Contributing

## Development Flow

1. Create a branch from `main`.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and fill local values.
4. Run the API with `npm run dev:api`.
5. Run the frontend with `npm run dev`.
6. Verify TypeScript with `npx tsc -b`.

## Code Style

- Keep UI components responsive and accessible.
- Prefer existing Tailwind tokens and design patterns before adding new ones.
- Keep backend validation near route boundaries.
- Add indexes when introducing new common query patterns.
- Do not commit real `.env` files or credentials.

## Pull Requests

Include:

- What changed.
- How it was tested.
- Screenshots for visual changes.
- Any deployment or environment changes.
