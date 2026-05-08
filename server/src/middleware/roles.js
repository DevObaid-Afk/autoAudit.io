import { AppError } from "../utils/AppError.js";

const roleRank = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      next(new AppError("You do not have permission to perform this action", 403));
      return;
    }

    next();
  };
}

export function requireMinimumRole(role) {
  return (req, _res, next) => {
    if (!req.user || roleRank[req.user.role] < roleRank[role]) {
      next(new AppError("You do not have permission to perform this action", 403));
      return;
    }

    next();
  };
}
