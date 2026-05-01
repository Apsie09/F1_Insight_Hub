import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { AuthSession } from "../types/auth";

const AUTH_SESSION_STORAGE_KEY = "f1_insight_hub_auth_session";

let memorySession: string | null = null;

const safeReadLocalStorage = (): string | null => {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
};

const safeWriteLocalStorage = (value: string | null): void => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, value);
  } catch {
    // Ignore localStorage write errors and keep in-memory fallback.
  }
};

const readRawSession = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_SESSION_STORAGE_KEY);
  } catch {
    if (Platform.OS === "web") {
      return safeReadLocalStorage();
    }
    return memorySession;
  }
};

const writeRawSession = async (value: string | null): Promise<void> => {
  try {
    if (value === null) {
      await SecureStore.deleteItemAsync(AUTH_SESSION_STORAGE_KEY);
      return;
    }
    await SecureStore.setItemAsync(AUTH_SESSION_STORAGE_KEY, value);
    return;
  } catch {
    // Continue with fallback below.
  }

  if (Platform.OS === "web") {
    safeWriteLocalStorage(value);
  }
  memorySession = value;
};

export const loadStoredAuthSession = async (): Promise<AuthSession | null> => {
  const raw = await readRawSession();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await writeRawSession(null);
    return null;
  }
};

export const saveStoredAuthSession = async (session: AuthSession): Promise<void> => {
  await writeRawSession(JSON.stringify(session));
};

export const clearStoredAuthSession = async (): Promise<void> => {
  await writeRawSession(null);
};
