import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { authService } from "../services/authService";
import type {
  AuthNotification,
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "../types/auth";
import { clearStoredAuthSession, loadStoredAuthSession, saveStoredAuthSession } from "./sessionStorage";

type AuthStatus = "restoring" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  notifications: AuthNotification[];
  unreadNotificationCount: number;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
  login: (input: LoginInput) => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  signOut: () => Promise<void>;
  switchAccount: () => Promise<void>;
  resetPassword: (input: ResetPasswordInput) => Promise<boolean>;
  markNotificationsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

const loadUserNotifications = async (token: string): Promise<AuthNotification[]> =>
  authService.getNotifications(token);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [notifications, setNotifications] = useState<AuthNotification[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSession = useCallback(async (nextSession: AuthSession) => {
    await saveStoredAuthSession(nextSession);
    setSession(nextSession);
  }, []);

  const completeAuth = useCallback(
    async (nextSession: AuthSession) => {
      const latestNotifications = await loadUserNotifications(nextSession.token);
      await persistSession(nextSession);
      setNotifications(latestNotifications);
      setStatus("signedIn");
      setError(null);
    },
    [persistSession]
  );

  useEffect(() => {
    let mounted = true;

    const restore = async () => {
      try {
        const storedSession = await loadStoredAuthSession();
        if (!mounted) {
          return;
        }

        if (!storedSession) {
          setStatus("signedOut");
          return;
        }

        const [restoredUser, restoredNotifications] = await Promise.all([
          authService.me(storedSession.token),
          loadUserNotifications(storedSession.token),
        ]);

        if (!mounted) {
          return;
        }

        const restoredSession: AuthSession = {
          ...storedSession,
          user: restoredUser,
        };
        setSession(restoredSession);
        setNotifications(restoredNotifications);
        setStatus("signedIn");
      } catch {
        await clearStoredAuthSession();
        if (mounted) {
          setSession(null);
          setNotifications([]);
          setStatus("signedOut");
        }
      }
    };

    void restore();

    return () => {
      mounted = false;
    };
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
    if (session?.token) {
      try {
        await authService.logout(session.token);
      } catch {
        // Clear local session even if remote logout fails.
      }
    }
    await clearStoredAuthSession();
    setSession(null);
    setNotifications([]);
    setStatus("signedOut");
    setError(null);
  }, [session?.token]);

  const switchAccount = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const refreshNotifications = useCallback(async () => {
    if (!session?.token) {
      return;
    }
    try {
      const nextNotifications = await loadUserNotifications(session.token);
      setNotifications(nextNotifications);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load notifications.");
    }
  }, [session?.token]);

  const markNotificationsRead = useCallback(async () => {
    if (!session?.token) {
      return;
    }
    try {
      await authService.markAllNotificationsRead(session.token);
      const nextNotifications = notifications.map((notification) =>
        notification.readAt ? notification : { ...notification, readAt: new Date().toISOString() }
      );
      setNotifications(nextNotifications);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to update notifications.");
    }
  }, [notifications, session?.token]);

  const resetPassword = useCallback(
    async (input: ResetPasswordInput): Promise<boolean> => {
      if (!session?.token) {
        return false;
      }

      setIsSubmitting(true);
      setError(null);
      try {
        await authService.resetPassword(session.token, input);
        await refreshNotifications();
        return true;
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Password reset failed.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [refreshNotifications, session?.token]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: session?.user ?? null,
      notifications,
      unreadNotificationCount: notifications.filter((notification) => !notification.readAt).length,
      isSubmitting,
      error,
      clearError: () => setError(null),
      login,
      register,
      signOut,
      switchAccount,
      resetPassword,
      markNotificationsRead,
      refreshNotifications,
    }),
    [
      error,
      isSubmitting,
      login,
      markNotificationsRead,
      notifications,
      refreshNotifications,
      register,
      resetPassword,
      session?.user,
      signOut,
      status,
      switchAccount,
    ]
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
