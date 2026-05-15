import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../api/client";

export function GoogleOAuthCallbackPage() {
  const { completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const oauthParams = useMemo(() => getOAuthParams(searchParams), [searchParams]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function finishGoogleSignIn() {
      const token = oauthParams.get("token");
      const session = parseOAuthSession(oauthParams.get("session"));
      const returnTo = cleanReturnTo(oauthParams.get("returnTo"));

      if (!token) {
        window.history.replaceState({}, "", "/oauth/google");
        setError("Google sign-in did not return an AutoAudit session.");
        return;
      }

      try {
        await completeOAuthLogin(token, session);
        navigate(returnTo, { replace: true });
      } catch (err) {
        window.history.replaceState({}, "", "/oauth/google");
        setError(getApiErrorMessage(err));
      }
    }

    finishGoogleSignIn();
  }, [completeOAuthLogin, navigate, oauthParams]);

  if (!error) {
    return <main className="min-h-screen bg-canvas" aria-label="Completing Google sign-in" />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center shadow-xl">
        <h1 className="text-xl font-extrabold tracking-normal">Google sign-in needs another try</h1>
        <p className="mt-2 text-sm leading-6 text-quiet">{error}</p>
        <Link className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-brand-strong" to="/login">
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

function getOAuthParams(searchParams: URLSearchParams) {
  if (searchParams.has("token")) {
    return searchParams;
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

function parseOAuthSession(value: string | null) {
  if (!value) return undefined;

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(window.atob(`${normalized}${padding}`));
    if (decoded?.user && decoded?.company) {
      return decoded;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function cleanReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
