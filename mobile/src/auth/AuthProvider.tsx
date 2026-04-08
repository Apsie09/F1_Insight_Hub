import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { AuthSession, AuthUser, LoginInput, RegisterInput } from "../types/auth";
import { authService } from "../services/authService";
import { clearStoredAuthSession, loadStoredAuthSession, saveStoredAuthSession } from "./sessionStorage";

type AuthStatus = "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [status, setStatus] = useState<AuthStatus>("signedOut");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      try {
        const storedSession = await loadStoredAuthSession();
        if (!mounted || !storedSession) {
          return;
        }

        setSession(storedSession);
        setStatus("signedIn");
      } catch {
        // Keep signed-out state if restore fails.
      }
    };

    restore();

    return () => {
      mounted = false;
    };
  }, []);

  const completeAuth = useCallback(async (nextSession: AuthSession) => {
    await saveStoredAuthSession(nextSession);
    setSession(nextSession);
    setStatus("signedIn");
    setError(null);
  }, []);

  const login = useCallback(
    async (input: LoginInput): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await authService.login(input);
        await completeAuth(response);
        return true;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Login failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [completeAuth]
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await authService.register(input);
        await completeAuth(response);
        return true;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Registration failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [completeAuth]
  );

  const signOut = useCallback(async () => {
    await clearStoredAuthSession();
    setSession(null);
    setStatus("signedOut");
    setError(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      isSubmitting,
      error,
      clearError: () => setError(null),
      login,
      register,
      signOut,
    }),
    [error, isSubmitting, login, register, session?.user, signOut, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
};
