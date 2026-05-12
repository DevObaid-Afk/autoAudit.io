import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/services";
import { getApiErrorMessage } from "../api/client";
import { PageMeta } from "../components/PageMeta";
import { AuthError, AuthLayout, AuthSuccess } from "./LoginPage";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function verify() {
      if (!token) {
        setError("Verification token is missing.");
        return;
      }

      try {
        const response = await authApi.verifyEmail({ token });
        if (isActive) setMessage(response.message);
      } catch (err) {
        if (isActive) setError(getApiErrorMessage(err));
      }
    }

    verify();

    return () => {
      isActive = false;
    };
  }, [token]);

  return (
    <AuthLayout title="Verify email" subtitle="Email verification protects your AutoAudit.ai workspace and keeps account recovery reliable.">
      <PageMeta title="Verify Email - AutoAudit.ai" description="Verify your AutoAudit.ai account email address." canonicalPath="/verify-email" noindex />
      <div className="grid gap-4">
        {!message && !error && <div className="rounded-lg border border-line bg-panel-subtle px-3 py-2 text-sm font-bold text-quiet">Verifying your email...</div>}
        {message && <AuthSuccess message={message} />}
        {error && <AuthError message={error} />}
        <Link className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/dashboard">
          Open dashboard
        </Link>
      </div>
    </AuthLayout>
  );
}
