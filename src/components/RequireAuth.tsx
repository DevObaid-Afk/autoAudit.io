import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function RequireAuth() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4 text-center">
        <div>
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="mt-4 text-sm font-extrabold text-quiet">Loading secure workspace</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

