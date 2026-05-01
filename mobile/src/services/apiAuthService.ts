import { apiBaseUrl } from "./apiService";
import type { AuthNotification, AuthUser, LoginInput, RegisterInput, ResetPasswordInput } from "../types/auth";
import type { AuthService } from "../types/services";

const buildUrl = (path: string): string => `${apiBaseUrl}${path}`;
const REQUEST_TIMEOUT_MS = 8000;

const fetchWithTimeout = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Backend request timed out. Check that the API URL points to your laptop LAN IP.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload?.detail)) {
      return payload.detail
        .map((entry: { msg?: string } | unknown) => {
          if (typeof entry === "object" && entry !== null && "msg" in entry) {
            return String((entry as { msg?: string }).msg ?? entry);
          }
          return String(entry);
        })
        .join(", ");
    }
  } catch {
    // Use status text below.
  }

  return `${response.status} ${response.statusText || "Request failed"}`.trim();
};

const authHeaders = (token: string, includeJson = false): HeadersInit => ({
  ...(includeJson ? { "Content-Type": "application/json" } : {}),
  Authorization: `Bearer ${token}`,
});

const postJson = async <T>(path: string, payload: LoginInput | RegisterInput | ResetPasswordInput): Promise<T> => {
  const response = await fetchWithTimeout(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as T;
};

export const apiAuthService: AuthService = {
  login: (input) => postJson("/auth/login", input),
  register: (input) => postJson("/auth/register", input),
  me: async (token) => {
    const response = await fetchWithTimeout(buildUrl("/auth/me"), {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    return (await response.json()) as AuthUser;
  },
  logout: async (token) => {
    const response = await fetchWithTimeout(buildUrl("/auth/logout"), {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  },
  getNotifications: async (token) => {
    const response = await fetchWithTimeout(buildUrl("/auth/notifications"), {
      headers: authHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
    const payload = (await response.json()) as { notifications: AuthNotification[] };
    return payload.notifications;
  },
  markAllNotificationsRead: async (token) => {
    const response = await fetchWithTimeout(buildUrl("/auth/notifications/read-all"), {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  },
  resetPassword: async (token, input) => {
    const response = await fetchWithTimeout(buildUrl("/auth/password/reset"), {
      method: "POST",
      headers: authHeaders(token, true),
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }
  },
};
