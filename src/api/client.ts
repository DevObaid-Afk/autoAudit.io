import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
const isLocalApi = API_URL.includes("localhost") || API_URL.includes("127.0.0.1");
const TOKEN_KEY = "autoaudit.authToken";

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
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
    }

    return Promise.reject(error);
  },
);

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function resolveApiAssetUrl(value?: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
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
