import { apiBaseUrl } from "./apiService";
import type { AuthService } from "../types/services";
import type { LoginInput, RegisterInput } from "../types/auth";

const buildUrl = (path: string): string => `${apiBaseUrl}${path}`;

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

const postJson = async <T>(path: string, payload: LoginInput | RegisterInput): Promise<T> => {
  const response = await fetch(buildUrl(path), {
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
};
