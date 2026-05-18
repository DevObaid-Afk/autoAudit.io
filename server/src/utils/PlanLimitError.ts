export type PlanLimitType = "vendors" | "reports" | "aiEmails" | "vendorAnalyses" | "trial";

export class PlanLimitError extends Error {
  statusCode: number;
  limitType: PlanLimitType;
  currentUsage: number;
  planLimit: number;
  upgradeToUnlock: string;

  constructor({
    limitType,
    currentUsage,
    planLimit,
    upgradeToUnlock,
    message,
  }: {
    limitType: PlanLimitType;
    currentUsage: number;
    planLimit: number;
    upgradeToUnlock: string;
    message: string;
  }) {
    super(message);
    this.name = "PlanLimitError";
    this.statusCode = 403;
    this.limitType = limitType;
    this.currentUsage = currentUsage;
    this.planLimit = planLimit;
    this.upgradeToUnlock = upgradeToUnlock;
    Error.captureStackTrace(this, this.constructor);
  }
}
