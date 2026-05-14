import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/services";
import { clearStoredToken, getApiErrorMessage, getStoredToken, setStoredToken } from "../api/client";
import type { ApiCompany, ApiUser } from "../types/api";

type AuthContextValue = {
  user: ApiUser | null;
  company: ApiCompany | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  authError: string;
  refreshSession: () => Promise<void>;
  updateUser: (user: ApiUser) => void;
  login: (input: { email: string; password: string }) => Promise<void>;
  signup: (input: { name: string; email: string; password: string; companyName: string; companyDomain?: string; plan?: string }) => Promise<void>;
  completeOAuthLogin: (token: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<ApiUser | null>(null);
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [isBootstrapping, setBootstrapping] = useState(Boolean(getStoredToken()));
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let isActive = true;

    async function bootstrapSession() {
      if (!token) {
        setBootstrapping(false);
        return;
      }

      try {
        const profile = await authApi.me();
        if (!isActive) return;
        setUser(profile.user);
        setCompany(profile.company);
      } catch (error) {
        if (!isActive) return;
        setAuthError(getApiErrorMessage(error));
        clearStoredToken();
        setToken(null);
        setUser(null);
        setCompany(null);
      } finally {
        if (isActive) {
          setBootstrapping(false);
        }
      }
    }

    bootstrapSession();

    return () => {
      isActive = false;
    };
  }, [token]);

  const refreshSession = useCallback(async () => {
    const profile = await authApi.me();
    setUser(profile.user);
    setCompany(profile.company);
  }, []);

  const updateUser = useCallback((nextUser: ApiUser) => {
    setUser(nextUser);
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    setAuthError("");
    const response = await authApi.login(input);
    setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
    setCompany(response.company);
  }, []);

  const signup = useCallback(async (input: { name: string; email: string; password: string; companyName: string; companyDomain?: string; plan?: string }) => {
    setAuthError("");
    const response = await authApi.signup(input);
    setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
    setCompany(response.company);
  }, []);

  const completeOAuthLogin = useCallback(async (nextToken: string) => {
    setAuthError("");
    setStoredToken(nextToken);
    setToken(nextToken);
    const profile = await authApi.me();
    setUser(profile.user);
    setCompany(profile.company);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setCompany(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      company,
      token,
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      authError,
      refreshSession,
      updateUser,
      login,
      signup,
      completeOAuthLogin,
      logout,
    }),
    [authError, company, completeOAuthLogin, isBootstrapping, login, logout, refreshSession, signup, token, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
