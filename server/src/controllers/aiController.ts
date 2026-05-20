import { Company } from "../models/Company.js";
import { Renewal } from "../models/Renewal.js";
import { Report } from "../models/Report.js";
import { Subscription } from "../models/Subscription.js";
import { Vendor } from "../models/Vendor.js";
import { buildAuditSummary } from "../services/wasteDetection.js";
import { generateAiText } from "../services/openaiService.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../utils/activityLogger.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { completeOnboardingStep } from "../utils/onboarding.js";
import {
  assertCanAnalyzeVendor,
  assertCanGenerateAiEmail,
  assertCanGenerateReport,
  incrementPlanUsage,
} from "../services/planLimits.js";
import { trackActivationEvent } from "../services/activationAnalytics.js";

const EMAIL_INSTRUCTIONS = `You are AutoAudit.ai, an expert SaaS spend operations assistant.
Write polished B2B vendor emails for finance and operations teams.
Use only the provided data. Do not invent contract terms, discounts, benchmarks, or dates.
Keep emails concise, professional, and ready to send. Return only the email body.`;

const ANALYSIS_INSTRUCTIONS = `You are AutoAudit.ai, an expert SaaS waste analyst.
Use only the provided vendor, renewal, subscription, and audit data.
Be specific, CFO-friendly, and action oriented. If data is missing, say what is missing.
Return clear markdown without code fences.`;

type ReportType = "cfo_summary" | "board_summary" | "owner_action_list" | "full_audit";

export const generateCancelEmail = asyncHandler(async (req, res) => {
  await assertCanGenerateAiEmail(req.companyId);

  const {
    vendorId,
    vendorName,
    tone = "direct",
    requestedAction = "cancel renewal",
    verifiedData,
  } = req.body;
  const vendor = await resolveVendor({
    companyId: req.companyId,
    vendorId,
    vendorName,
    required: true,
  });
  const renewal = await findRenewalForVendor(req.companyId, vendor?._id);
  const dataSentToAi = buildEmailPromptContext({
    req,
    vendor,
    renewal,
    verifiedData,
    emailGoal: "cancel",
  });

  const draft = await generateAiText({
    instructions: EMAIL_INSTRUCTIONS,
    maxOutputTokens: 750,
    input: buildPromptPayload(
      "Generate a cancellation email for this SaaS vendor.",
      {
        tone,
        requestedAction,
        workspace: await getWorkspaceContext(req),
        ...dataSentToAi.promptContext,
      },
    ),
  });

  await incrementPlanUsage(req.companyId, "aiEmailsGenerated");
  await recordActivity(req, {
    action: "email_draft.generated",
    entityType: "email_draft",
    entityId: vendor?._id,
    entityName: vendor?.name ?? vendorName,
    metadata: { kind: "cancel", tone, requestedAction },
  });
  await recordAuditLog(req, {
    action: "email_draft.ai_context_sent",
    resourceType: "email_draft",
    resourceId: vendor?._id,
    metadata: {
      kind: "cancel",
      tone,
      requestedAction,
      dataSentToAi,
    },
  });
  await completeOnboardingStep(req.companyId, "createdEmailDraft");
  await trackActivationEvent({
    req,
    eventName: "ai_email_generated",
    properties: { emailType: "cancel", vendorId: vendor?._id },
  });

  res.json({
    draft,
    metadata: {
      vendorId: vendor?._id,
      vendorName: vendor?.name ?? vendorName,
      tone,
      generatedAt: new Date().toISOString(),
    },
  });
});

export const generateRenegotiateEmail = asyncHandler(async (req, res) => {
  await assertCanGenerateAiEmail(req.companyId);

  const {
    vendorId,
    vendorName,
    renewalId,
    tone = "direct",
    negotiationGoal = "reduce renewal cost",
    verifiedData,
  } = req.body;
  const renewal = renewalId
    ? await Renewal.findOne({
        _id: renewalId,
        company: req.companyId,
      }).populate("vendor")
    : null;
  const vendor =
    renewal?.vendor ??
    (await resolveVendor({
      companyId: req.companyId,
      vendorId,
      vendorName,
      required: true,
    }));
  const vendorRenewal =
    renewal ?? (await findRenewalForVendor(req.companyId, vendor?._id));
  const dataSentToAi = buildEmailPromptContext({
    req,
    vendor,
    renewal: vendorRenewal,
    verifiedData,
    emailGoal: negotiationGoal === "right-size seat count" ? "reduce_seats" : "renegotiate",
  });

  const draft = await generateAiText({
    instructions: EMAIL_INSTRUCTIONS,
    maxOutputTokens: 850,
    input: buildPromptPayload(
      "Generate a renegotiation email before renewal.",
      {
        tone,
        negotiationGoal,
        workspace: await getWorkspaceContext(req),
        ...dataSentToAi.promptContext,
        guidance: [
          "Ask for better pricing, right-sized seats, or a lower-commitment plan.",
          "Mention renewal timing only if provided.",
          "Do not claim benchmark data unless it is present in the payload.",
        ],
      },
    ),
  });
  await incrementPlanUsage(req.companyId, "aiEmailsGenerated");
  await recordActivity(req, {
    action: "email_draft.generated",
    entityType: "email_draft",
    entityId: vendor?._id,
    entityName: vendor?.name ?? vendorName,
    metadata: { kind: "renegotiate", tone, negotiationGoal },
  });
  await recordAuditLog(req, {
    action: "email_draft.ai_context_sent",
    resourceType: "email_draft",
    resourceId: vendor?._id,
    metadata: {
      kind: "renegotiate",
      tone,
      negotiationGoal,
      dataSentToAi,
    },
  });
  await completeOnboardingStep(req.companyId, "createdEmailDraft");
  await trackActivationEvent({
    req,
    eventName: "ai_email_generated",
    properties: {
      emailType: negotiationGoal === "right-size seat count" ? "seat_reduction" : "renegotiate",
      vendorId: vendor?._id,
    },
  });

  res.json({
    draft,
    metadata: {
      vendorId: vendor?._id,
      vendorName: vendor?.name ?? vendorName,
      renewalId: vendorRenewal?._id,
      tone,
      generatedAt: new Date().toISOString(),
    },
  });
});

export const generateMonthlyReport = asyncHandler(async (req, res) => {
  await assertCanGenerateReport(req.companyId);

  const { periodStart, periodEnd, audience = "CFO" } = req.body;
  const reportType = cleanReportType(req.body.reportType);
  const reportConfig = getReportTypeConfig(reportType);
  const [company, vendors, subscriptions, renewals] = await Promise.all([
    Company.findById(req.companyId),
    Vendor.find({ company: req.companyId })
      .sort({ monthlySpend: -1, name: 1 })
      .limit(80),
    Subscription.find({ company: req.companyId }).populate("vendor").limit(80),
    Renewal.find({ company: req.companyId })
      .populate("vendor subscription")
      .sort({ renewalDate: 1 })
      .limit(40),
  ]);

  const summary = buildAuditSummary({ vendors, subscriptions, renewals });
  const reportText = await generateAiText({
    instructions: ANALYSIS_INSTRUCTIONS,
    maxOutputTokens: reportType === "full_audit" ? 1800 : 1400,
    input: buildPromptPayload(
      reportConfig.task,
      {
        audience,
        reportType,
        periodStart,
        periodEnd,
        workspace: {
          companyName: company?.name,
          companyDomain: company?.domain,
          requestedBy: req.user?.name,
        },
        auditSummary: summary,
        topVendors: vendors.slice(0, 20).map((vendor) => vendorSnapshot(vendor)),
        upcomingRenewals: renewals.slice(0, 15).map((renewal) => renewalSnapshot(renewal)),
        reportFormat: reportConfig.sections,
      },
    ),
  });

  const report: any = await Report.create({
    company: req.companyId,
    requestedBy: req.user._id,
    title: `${new Date().toLocaleString("en-US", { month: "long", year: "numeric" })} AI SaaS Waste Report`,
    type: "monthly_waste",
    reportType,
    periodStart,
    periodEnd,
    summary,
    findings: [{ type: "ai_report", content: reportText }],
    content: reportText,
    status: "ready",
  });
  await incrementPlanUsage(req.companyId, "reportsGenerated");
  await recordActivity(req, {
    action: "report.generated",
    entityType: "report",
    entityId: report._id,
    entityName: report.title,
    metadata: { type: report.type, reportType, audience },
  });
  await completeOnboardingStep(req.companyId, "generatedReport");
  await trackActivationEvent({
    req,
    eventName: "report_generated",
    properties: { reportType: "ai" },
  });

  res.status(201).json({
    report: reportText,
    savedReportId: report._id,
    summary,
    metadata: {
      generatedAt: new Date().toISOString(),
    },
  });
});

function cleanReportType(value: unknown): ReportType {
  const allowed = new Set<ReportType>(["cfo_summary", "board_summary", "owner_action_list", "full_audit"]);
  return typeof value === "string" && allowed.has(value as ReportType) ? (value as ReportType) : "cfo_summary";
}

function getReportTypeConfig(reportType: ReportType) {
  const configs = {
    cfo_summary: {
      task: "Generate a CFO summary SaaS waste report focused on savings opportunity, ROI, and recommended actions.",
      sections: ["Executive summary", "Savings opportunity", "ROI view", "Recommended actions", "Risks and owners"],
    },
    board_summary: {
      task: "Generate a board-level SaaS spend summary focused on high-level spend overview and risk areas.",
      sections: ["Board summary", "Spend overview", "Risk areas", "Material savings opportunities", "Next-quarter focus"],
    },
    owner_action_list: {
      task: "Generate an owner action list grouped by owner with per-vendor cleanup actions.",
      sections: ["Owner action list", "Actions by owner", "Vendor", "Recommended action", "Evidence", "Target outcome"],
    },
    full_audit: {
      task: "Generate a complete SaaS audit with vendor breakdowns and evidence for every major finding.",
      sections: ["Full audit summary", "Vendor breakdown", "Waste evidence", "Duplicate tools", "Renewal risk", "Savings plan"],
    },
  };

  return configs[reportType] ?? configs.cfo_summary;
}

export const analyzeVendor = asyncHandler(async (req, res) => {
  await assertCanAnalyzeVendor(req.companyId);

  const { vendorId, vendorName, mode } = req.body;
  const vendor =
    vendorId || vendorName
      ? await resolveVendor({
          companyId: req.companyId,
          vendorId,
          vendorName,
          required: false,
        })
      : null;
  const [vendors, subscriptions, renewals] = await Promise.all([
    Vendor.find({ company: req.companyId })
      .sort({ monthlySpend: -1, name: 1 })
      .limit(80),
    Subscription.find({ company: req.companyId }).populate("vendor").limit(80),
    Renewal.find({ company: req.companyId })
      .populate("vendor subscription")
      .sort({ renewalDate: 1 })
      .limit(40),
  ]);

  const summary = buildAuditSummary({ vendors, subscriptions, renewals });
  const analysisMode =
    mode ?? (vendor ? "waste_explanation" : "duplicate_tools");

  if (analysisMode === "waste_explanation" && !vendor) {
    throw new AppError(
      "vendorId or vendorName is required for waste explanation",
      400,
    );
  }

  const analysis = await generateAiText({
    instructions: ANALYSIS_INSTRUCTIONS,
    maxOutputTokens: analysisMode === "duplicate_tools" ? 900 : 750,
    input: buildPromptPayload(
      analysisMode === "duplicate_tools"
        ? "Suggest duplicate SaaS tools and consolidation actions."
        : "Explain why this SaaS vendor is marked as waste.",
      {
        mode: analysisMode,
        workspace: await getWorkspaceContext(req),
        selectedVendor: vendor ? vendorSnapshot(vendor) : undefined,
        selectedVendorEvidence: vendor
          ? buildWasteEvidence(
              vendor,
              await findRenewalForVendor(req.companyId, vendor._id),
            )
          : undefined,
        auditSummary: summary,
        vendorsByCategory: groupVendorsByCategory(vendors),
        wasteSignals: summary.wasteSignals,
        duplicateTools: summary.duplicateTools,
      },
    ),
  });
  await incrementPlanUsage(req.companyId, "vendorAnalysesGenerated");
  if (analysisMode === "waste_explanation") {
    await completeOnboardingStep(req.companyId, "reviewedWaste");
  }
  if (summary.wasteSignals.length > 0) {
    await trackActivationEvent({
      req,
      eventName: "waste_signal_viewed",
      properties: {
        signalType: vendor?.status ?? summary.wasteSignals[0]?.type ?? "unknown",
        signalCount: summary.wasteSignals.length,
      },
    });
  }

  res.json({
    analysis,
    metadata: {
      mode: analysisMode,
      vendorId: vendor?._id,
      vendorName: vendor?.name,
      generatedAt: new Date().toISOString(),
    },
  });
});

async function resolveVendor({ companyId, vendorId, vendorName, required }) {
  let vendor = null;

  if (vendorId) {
    vendor = await Vendor.findOne({ _id: vendorId, company: companyId });
  } else if (vendorName) {
    vendor = await Vendor.findOne({
      company: companyId,
      name: new RegExp(`^${escapeRegex(vendorName)}$`, "i"),
    });
  }

  if (required && !vendor) {
    throw new AppError("Vendor not found", 404);
  }

  return vendor;
}

async function findRenewalForVendor(companyId, vendorId) {
  if (!vendorId) return null;

  return Renewal.findOne({ company: companyId, vendor: vendorId }).sort({
    renewalDate: 1,
  });
}

async function getWorkspaceContext(req) {
  const company = await Company.findById(req.companyId);

  return {
    companyName: company?.name,
    companyDomain: company?.domain,
    requestedBy: req.user?.name,
    requesterRole: req.user?.role,
  };
}

function buildPromptPayload(task, data) {
  return `${task}

Data:
${JSON.stringify(data, null, 2)}`;
}

function buildEmailPromptContext({
  req,
  vendor,
  renewal,
  verifiedData,
  emailGoal,
}: {
  req: any;
  vendor: any;
  renewal: any;
  verifiedData: any;
  emailGoal: string;
}) {
  const sanitizedOverrides = sanitizeVerifiedEmailData(verifiedData);
  const vendorData = vendorSnapshot(vendor, sanitizedOverrides);
  const renewalData = renewalSnapshot(renewal, sanitizedOverrides);

  return {
    promptContext: {
      vendor: vendorData,
      renewal: renewalData,
      evidence: buildWasteEvidenceFromSnapshot(vendorData, renewalData),
      dataVerification: {
        emailGoal,
        verifiedAt: sanitizedOverrides.verifiedAt ?? new Date().toISOString(),
        verifiedBy: req.user?.email,
        source: "user_verified_pre_generation",
        storedVendorUpdatedAt: vendor?.updatedAt,
        overridesApplied: sanitizedOverrides,
        note: "These values were confirmed in the pre-generation review step and may differ from the stored Vendor record.",
      },
    },
    storedData: {
      vendor: vendorSnapshot(vendor),
      renewal: renewalSnapshot(renewal),
    },
    verifiedOverrides: sanitizedOverrides,
  };
}

function sanitizeVerifiedEmailData(value: any) {
  if (!value || typeof value !== "object") return {};

  const overrides: Record<string, any> = {};
  const vendorName = cleanNullableString(value.vendorName, 140);
  const lastUsedAt = cleanNullableDate(value.lastUsedAt);
  const renewalDate = cleanNullableDate(value.renewalDate);
  const verifiedAt = cleanNullableDate(value.verifiedAt);

  if (vendorName) overrides.vendorName = vendorName;
  if (lastUsedAt) overrides.lastUsedAt = lastUsedAt;
  if (renewalDate) overrides.renewalDate = renewalDate;
  if (verifiedAt) overrides.verifiedAt = verifiedAt;
  if (["cancel", "renegotiate", "reduce_seats"].includes(value.emailGoal)) {
    overrides.emailGoal = value.emailGoal;
  }

  for (const field of ["monthlySpend", "seatsPurchased", "activeSeats"]) {
    if (value[field] === "" || value[field] === null || value[field] === undefined) continue;
    const parsed = Number(value[field]);
    if (Number.isFinite(parsed) && parsed >= 0) {
      overrides[field] = parsed;
    }
  }

  return overrides;
}

function cleanNullableString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanNullableDate(value: unknown) {
  if (!value) return undefined;
  if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function vendorSnapshot(vendor: any, overrides: Record<string, any> = {}) {
  if (!vendor) return null;

  const monthlySpend = Number(overrides.monthlySpend ?? vendor.monthlySpend ?? 0);
  const seatsPurchased = Number(overrides.seatsPurchased ?? vendor.seatsPurchased ?? 0);
  const activeSeats = Number(overrides.activeSeats ?? vendor.activeSeats ?? 0);
  const lastUsedAt = overrides.lastUsedAt ?? vendor.lastUsedAt;
  const renewalDate = overrides.renewalDate ?? vendor.renewalDate;

  return {
    id: vendor._id,
    name: overrides.vendorName ?? vendor.name,
    category: vendor.category,
    ownerName: vendor.ownerName,
    ownerEmail: vendor.ownerEmail,
    monthlySpend,
    annualSpend: monthlySpend * 12,
    seatsPurchased,
    activeSeats,
    unusedSeats: Math.max(
      seatsPurchased - activeSeats,
      0,
    ),
    lastUsedAt,
    daysSinceLastUse: lastUsedAt ? daysSince(lastUsedAt) : null,
    renewalDate,
    status: vendor.status,
    riskScore: vendor.riskScore,
    source: vendor.source,
    notes: vendor.notes,
  };
}

function renewalSnapshot(renewal: any, overrides: Record<string, any> = {}) {
  if (!renewal) return null;

  return {
    id: renewal._id,
    vendorName: renewal.vendor?.name,
    renewalDate: overrides.renewalDate ?? renewal.renewalDate,
    noticeDeadline: renewal.noticeDeadline,
    contractValue: renewal.contractValue,
    status: renewal.status,
    riskLevel: renewal.riskLevel,
    recommendation: renewal.recommendation,
  };
}

function buildWasteEvidenceFromSnapshot(vendor: any, renewal: any) {
  if (!vendor) return [];

  const evidence = [];

  if (vendor.status !== "active") {
    evidence.push(`Vendor status is ${vendor.status}.`);
  }

  if (vendor.riskScore) {
    evidence.push(`Risk score is ${vendor.riskScore}/100.`);
  }

  if (vendor.unusedSeats > 0) {
    evidence.push(
      `${vendor.unusedSeats} of ${vendor.seatsPurchased} purchased seats appear unused.`,
    );
  }

  if (vendor.lastUsedAt) {
    evidence.push(
      `Last verified usage date was ${new Date(vendor.lastUsedAt).toISOString().slice(0, 10)} (${daysSince(vendor.lastUsedAt)} days ago).`,
    );
  }

  if (vendor.monthlySpend) {
    evidence.push(
      `Verified monthly spend is $${Number(vendor.monthlySpend).toLocaleString("en-US")}.`,
    );
  }

  if (renewal?.renewalDate) {
    evidence.push(
      `Verified renewal date is ${new Date(renewal.renewalDate).toISOString().slice(0, 10)}.`,
    );
  } else if (vendor.renewalDate) {
    evidence.push(
      `Verified vendor renewal date is ${new Date(vendor.renewalDate).toISOString().slice(0, 10)}.`,
    );
  }

  return evidence;
}

function buildWasteEvidence(vendor, renewal) {
  if (!vendor) return [];

  const evidence = [];
  const unusedSeats = Math.max(
    Number(vendor.seatsPurchased ?? 0) - Number(vendor.activeSeats ?? 0),
    0,
  );

  if (vendor.status !== "active") {
    evidence.push(`Vendor status is ${vendor.status}.`);
  }

  if (vendor.riskScore) {
    evidence.push(`Risk score is ${vendor.riskScore}/100.`);
  }

  if (unusedSeats > 0) {
    evidence.push(
      `${unusedSeats} of ${vendor.seatsPurchased} purchased seats appear unused.`,
    );
  }

  if (vendor.lastUsedAt) {
    evidence.push(
      `Last detected usage was ${daysSince(vendor.lastUsedAt)} days ago.`,
    );
  }

  if (vendor.monthlySpend) {
    evidence.push(
      `Monthly spend is $${Number(vendor.monthlySpend).toLocaleString("en-US")}.`,
    );
  }

  if (renewal?.renewalDate) {
    evidence.push(
      `Renewal date is ${new Date(renewal.renewalDate).toISOString().slice(0, 10)}.`,
    );
  } else if (vendor.renewalDate) {
    evidence.push(
      `Vendor renewal date is ${new Date(vendor.renewalDate).toISOString().slice(0, 10)}.`,
    );
  }

  return evidence;
}

function groupVendorsByCategory(vendors) {
  const groups = new Map();

  for (const vendor of vendors) {
    const key = vendor.category || "Uncategorized";
    const group = groups.get(key) ?? [];
    group.push(vendorSnapshot(vendor));
    groups.set(key, group);
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([category, group]) => ({ category, vendors: group }));
}

function daysSince(date) {
  return Math.floor(
    (Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000),
  );
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
