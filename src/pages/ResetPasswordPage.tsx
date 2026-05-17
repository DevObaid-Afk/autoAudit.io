import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authApi } from "../api/services";
import { getApiErrorMessage } from "../api/client";
import { PageMeta } from "../components/PageMeta";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import { usePasswordStrength } from "../hooks/usePasswordStrength";
import { AuthError, AuthField, AuthLayout, AuthSuccess } from "./LoginPage";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const passwordStrength = usePasswordStrength(password);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await authApi.resetPassword({ token, password });
      setMessage(response.message);
      setPassword("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Create a new password for your AutoAudit.ai workspace. Reset links expire after 30 minutes.">
      <PageMeta title="Choose New Password - AutoAudit.ai" description="Set a new AutoAudit.ai account password." canonicalPath="/reset-password" noindex />
      <form className="grid gap-4" onSubmit={handleSubmit}>
        {!token && <AuthError message="Reset token is missing. Request a new password reset link." />}
        {message && <AuthSuccess message={message} />}
        {error && <AuthError message={error} />}
        <AuthField label="New password">
          <input className="input" type="password" value={password} autoComplete="new-password" placeholder="At least 8 characters" minLength={8} onChange={(event) => setPassword(event.target.value)} required />
          <PasswordStrengthMeter password={password} />
        </AuthField>
        <button className="min-h-11 rounded-lg bg-brand px-4 text-sm font-extrabold text-white shadow-[0_10px_24px_rgb(var(--color-brand)/0.2)] transition hover:-translate-y-0.5 hover:bg-brand-strong disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isSubmitting || !token || passwordStrength.score < 4}>
          {isSubmitting ? "Saving..." : "Reset password"}
        </button>
        <Link className="text-center text-sm font-extrabold text-brand hover:text-brand-strong" to="/login">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
