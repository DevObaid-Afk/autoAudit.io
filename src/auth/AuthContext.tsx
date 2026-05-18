import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { authApi } from "../api/services";
import { clearStoredAuth, getApiErrorMessage, getStoredRefreshToken, getStoredToken, setStoredRefreshToken, setStoredToken } from "../api/client";
import type { ApiCompany, ApiUser, AuthResponse } from "../types/api";

type AuthContextValue = {
  user: ApiUser | null;
  company: ApiCompany | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  authError: string;
  refreshSession: () => Promise<void>;
  updateUser: (user: ApiUser) => void;
  login: (input: { email: string; password: string }) => Promise<AuthResponse | void>;
  completeMfaLogin: (input: { mfaSessionToken: string; code: string }) => Promise<void>;
  signup: (input: { name: string; email: string; password: string; companyName: string; companyDomain?: string; plan?: string }) => Promise<void>;
  completeOAuthLogin: (token: string, refreshToken?: string | null, session?: { user: ApiUser; company: ApiCompany }) => Promise<void>;
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
        clearStoredAuth();
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

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    if (!response.token || !response.user || !response.company) {
      throw new Error("Complete authentication session was not returned.");
    }

    setStoredToken(response.token);
    if (response.refreshToken) setStoredRefreshToken(response.refreshToken);
    setToken(response.token);
    setUser(response.user);
    setCompany(response.company);
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    setAuthError("");
    const response = await authApi.login(input);
    if (response.mfaRequired) return response;
    applyAuthResponse(response);
  }, [applyAuthResponse]);

  const completeMfaLogin = useCallback(async (input: { mfaSessionToken: string; code: string }) => {
    setAuthError("");
    applyAuthResponse(await authApi.completeMfaChallenge(input));
  }, [applyAuthResponse]);

  const signup = useCallback(async (input: { name: string; email: string; password: string; companyName: string; companyDomain?: string; plan?: string }) => {
    setAuthError("");
    const response = await authApi.signup(input);
    applyAuthResponse(response);
  }, [applyAuthResponse]);

  const completeOAuthLogin = useCallback(async (nextToken: string, refreshToken?: string | null, session?: { user: ApiUser; company: ApiCompany }) => {
    setAuthError("");
    setStoredToken(nextToken);
    if (refreshToken) setStoredRefreshToken(refreshToken);
    setToken(nextToken);
    if (session) {
      setUser(session.user);
      setCompany(session.company);
      setBootstrapping(false);
      return;
    }

    const profile = await authApi.me();
    setUser(profile.user);
    setCompany(profile.company);
  }, []);

  const logout = useCallback(() => {
    const refreshToken = getStoredRefreshToken();
    authApi.logout(refreshToken).catch(() => undefined);
    clearStoredAuth();
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
      completeMfaLogin,
      signup,
      completeOAuthLogin,
      logout,
    }),
    [authError, company, completeMfaLogin, completeOAuthLogin, isBootstrapping, login, logout, refreshSession, signup, token, updateUser, user],
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
