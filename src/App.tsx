import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { ContactPage } from "./pages/ContactPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { PricingPage } from "./pages/PricingPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/:section" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
