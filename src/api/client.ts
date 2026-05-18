import axios from "axios";
import type { PlanLimitErrorPayload } from "../types/api";

export const API_URL = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000").replace(/\/$/, "");
const isLocalApi = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
const TOKEN_KEY = "autoaudit.authToken";
const REFRESH_TOKEN_KEY = "autoaudit.refreshToken";
let refreshPromise: Promise<string> | null = null;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const message = error.response?.data?.error?.message;
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url ?? "");

    if (status === 401 && originalRequest && !originalRequest._retry && !requestUrl.includes("/api/auth/refresh") && !requestUrl.includes("/api/auth/logout")) {
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch {
        clearStoredAuth();
        if (window.location.pathname !== "/login") {
          window.location.assign("/login?reason=session_expired");
        }
      }
    }

    if (status === 401 && message === "Session expired. Please log in again.") {
      clearStoredAuth();
      if (window.location.pathname !== "/login") {
        window.location.assign("/login?reason=session_expired");
      }
    }

    const planLimitError = getPlanLimitErrorPayload(error);
    if (planLimitError) {
      window.dispatchEvent(new CustomEvent("autoaudit:plan-limit", { detail: planLimitError }));
    }

    return Promise.reject(error);
  },
);

export function getPlanLimitErrorPayload(error: unknown): PlanLimitErrorPayload | null {
  if (!axios.isAxiosError(error)) return null;

  const payload = error.response?.data;
  if (payload?.error !== "plan_limit_reached") return null;

  return {
    error: "plan_limit_reached",
    limitType: payload.limitType,
    currentUsage: Number(payload.currentUsage ?? 0),
    planLimit: Number(payload.planLimit ?? 0),
    upgradeToUnlock: payload.upgradeToUnlock,
    message: payload.message ?? "You have reached a plan limit.",
    requestId: payload.requestId,
  };
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(refreshToken: string) {
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredRefreshToken() {
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearStoredAuth() {
  clearStoredToken();
  clearStoredRefreshToken();
}

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token is available");
  }

  refreshPromise ??= axios
    .post<{ token: string; refreshToken?: string }>(`${API_URL}/api/auth/refresh`, { refreshToken }, {
      headers: { "Content-Type": "application/json" },
    })
    .then(({ data }) => {
      setStoredToken(data.token);
      if (data.refreshToken) {
        setStoredRefreshToken(data.refreshToken);
      }
      return data.token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function resolveApiAssetUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const planLimitError = getPlanLimitErrorPayload(error);
    if (planLimitError) return planLimitError.message;

    if (error.code === "ERR_NETWORK") {
      if (isLocalApi) {
        return `Cannot reach the AutoAudit API at ${API_URL}, or the browser blocked the request. Make sure npm run dev:api is running, then refresh and try again.`;
      }

      return `Cannot reach the AutoAudit API at ${API_URL}, or the browser blocked the request. Please refresh and try again.`;
    }

    return error.response?.data?.error?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}
