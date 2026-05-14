export function parsePagination(query) {
  const page = clampInt(query.page, 1, 500, 1);
  const limit = clampInt(query.limit, 1, 100, 25);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

export function buildPagination({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}
