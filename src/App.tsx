import { lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";

const AboutDeveloperPage = lazy(() => import("./pages/AboutDeveloperPage").then((module) => ({ default: module.AboutDeveloperPage })));
const AiBoundariesPage = lazy(() => import("./pages/AiBoundariesPage").then((module) => ({ default: module.AiBoundariesPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const DataSafetyPage = lazy(() => import("./pages/DataSafetyPage").then((module) => ({ default: module.DataSafetyPage })));
const DemoPage = lazy(() => import("./pages/DemoPage").then((module) => ({ default: module.DemoPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LegalPage = lazy(() => import("./pages/LegalPage").then((module) => ({ default: module.LegalPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage").then((module) => ({ default: module.ForgotPasswordPage })));
const PricingPage = lazy(() => import("./pages/PricingPage").then((module) => ({ default: module.PricingPage })));
const ReportProofPage = lazy(() => import("./pages/ReportProofPage").then((module) => ({ default: module.ReportProofPage })));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage").then((module) => ({ default: module.ResetPasswordPage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((module) => ({ default: module.SignupPage })));
const StarterGuidePage = lazy(() => import("./pages/StarterGuidePage").then((module) => ({ default: module.StarterGuidePage })));
const TrustCenterPage = lazy(() => import("./pages/TrustCenterPage").then((module) => ({ default: module.TrustCenterPage })));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage").then((module) => ({ default: module.VerifyEmailPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));

export function App() {
  return (
    <Sentry.ErrorBoundary fallback={<RouteError />}>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/ai-boundaries" element={<AiBoundariesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/report-proof" element={<ReportProofPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/data-safety" element={<DataSafetyPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/starter-guide" element={<StarterGuidePage />} />
          <Route path="/trust" element={<TrustCenterPage />} />
          <Route path="/about-developer" element={<AboutDeveloperPage />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/:section" element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Sentry.ErrorBoundary>
  );
}

function RouteError() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 text-center text-ink">
      <div className="max-w-md rounded-lg border border-line bg-panel p-6 shadow-xl">
        <h1 className="text-xl font-extrabold tracking-normal">Something went wrong</h1>
        <p className="mt-2 text-sm leading-6 text-quiet">The page hit an unexpected error. Please refresh and try again.</p>
      </div>
    </main>
  );
}

function RouteLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas text-ink">
      <div className="grid justify-items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <span className="text-sm font-extrabold text-quiet">Loading AutoAudit.ai</span>
      </div>
    </main>
  );
}
