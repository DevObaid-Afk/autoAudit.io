import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";

const AboutDeveloperPage = lazy(() => import("./pages/AboutDeveloperPage").then((module) => ({ default: module.AboutDeveloperPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((module) => ({ default: module.ContactPage })));
const DemoPage = lazy(() => import("./pages/DemoPage").then((module) => ({ default: module.DemoPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const LegalPage = lazy(() => import("./pages/LegalPage").then((module) => ({ default: module.LegalPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const PricingPage = lazy(() => import("./pages/PricingPage").then((module) => ({ default: module.PricingPage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((module) => ({ default: module.SignupPage })));
const StarterGuidePage = lazy(() => import("./pages/StarterGuidePage").then((module) => ({ default: module.StarterGuidePage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));

export function App() {
  return (
    <>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/starter-guide" element={<StarterGuidePage />} />
          <Route path="/about-developer" element={<AboutDeveloperPage />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/:section" element={<DashboardPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
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
