import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getApiErrorMessage } from "../api/client";

export function GoogleOAuthCallbackPage() {
  const { completeOAuthLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function finishGoogleSignIn() {
      const token = searchParams.get("token");
      const returnTo = cleanReturnTo(searchParams.get("returnTo"));

      if (!token) {
        setError("Google sign-in did not return an AutoAudit session.");
        return;
      }

      try {
        await completeOAuthLogin(token);
        if (isActive) {
          navigate(returnTo, { replace: true });
        }
      } catch (err) {
        if (isActive) {
          setError(getApiErrorMessage(err));
        }
      }
    }

    finishGoogleSignIn();

    return () => {
      isActive = false;
    };
  }, [completeOAuthLogin, navigate, searchParams]);

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center shadow-xl">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-line border-t-brand" />
        <h1 className="mt-4 text-xl font-extrabold tracking-normal">{error ? "Google sign-in needs another try" : "Finishing Google sign-in"}</h1>
        <p className="mt-2 text-sm leading-6 text-quiet">{error || "One moment while AutoAudit opens your workspace."}</p>
      </div>
    </main>
  );
}

function cleanReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
