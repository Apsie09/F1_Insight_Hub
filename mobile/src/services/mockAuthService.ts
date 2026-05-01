import type { AuthNotification, AuthResponse, AuthUser, LoginInput, RegisterInput, ResetPasswordInput } from "../types/auth";
import type { AuthService } from "../types/services";

type StoredUser = {
  user: AuthUser;
  password: string;
  notifications: AuthNotification[];
};

const nowIso = (): string => new Date().toISOString();

const DEFAULT_USER: StoredUser = {
  user: {
    id: 1,
    email: "demo@f1insighthub.dev",
    displayName: "Demo User",
  },
  password: "DemoPass!123",
  notifications: [
    {
      id: 1,
      type: "success",
      title: "Session ready",
      message: "Demo account is ready for local mock testing.",
      createdAt: nowIso(),
      readAt: nowIso(),
    },
  ],
};

let nextUserId = 2;
let nextNotificationId = 2;
const usersByEmail = new Map<string, StoredUser>();
const tokensToEmail = new Map<string, string>();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const seedDefaults = () => {
  usersByEmail.clear();
  tokensToEmail.clear();
  usersByEmail.set(DEFAULT_USER.user.email, structuredClone(DEFAULT_USER));
  nextUserId = 2;
  nextNotificationId = 2;
};

seedDefaults();

const buildToken = (userId: number): string => `mock-token-${userId}-${Date.now()}`;

const buildResponse = (user: AuthUser): AuthResponse => {
  const token = buildToken(user.id);
  tokensToEmail.set(token, user.email);
  return {
    token,
    user,
  };
};

const validatePassword = (password: string): void => {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
};

const validateEmail = (email: string): void => {
  const normalized = normalizeEmail(email);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    throw new Error("Enter a valid email address.");
  }
};

const resolveStoredUserFromToken = (token: string): StoredUser => {
  const email = tokensToEmail.get(token);
  if (!email) {
    throw new Error("Session expired or invalid.");
  }
  const stored = usersByEmail.get(email);
  if (!stored) {
    throw new Error("Session expired or invalid.");
  }
  return stored;
};

const createNotification = (stored: StoredUser, type: string, title: string, message: string, readAt: string | null = null) => {
  stored.notifications.unshift({
    id: nextNotificationId,
    type,
    title,
    message,
    createdAt: nowIso(),
    readAt,
  });
  nextNotificationId += 1;
};

const login = async (input: LoginInput): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(input.email);
  const stored = usersByEmail.get(normalizedEmail);
  if (!stored || stored.password !== input.password) {
    throw new Error("Invalid email or password.");
  }

  return buildResponse(stored.user);
};

const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const normalizedEmail = normalizeEmail(input.email);
  validateEmail(normalizedEmail);
  validatePassword(input.password);

  if (usersByEmail.has(normalizedEmail)) {
    throw new Error("Account already exists for this email.");
  }

  const stored: StoredUser = {
    user: {
      id: nextUserId,
      email: normalizedEmail,
      displayName: input.displayName.trim() || normalizedEmail.split("@")[0],
    },
    password: input.password,
    notifications: [],
  };
  nextUserId += 1;

  createNotification(
    stored,
    "email_verification",
    "Verify your email",
    "Verify your email from the account menu to complete your account setup."
  );

  usersByEmail.set(normalizedEmail, stored);
  return buildResponse(stored.user);
};

export const mockAuthService: AuthService = {
  login,
  register,
  me: async (token) => resolveStoredUserFromToken(token).user,
  logout: async (token) => {
    tokensToEmail.delete(token);
  },
  getNotifications: async (token) => resolveStoredUserFromToken(token).notifications,
  markAllNotificationsRead: async (token) => {
    const stored = resolveStoredUserFromToken(token);
    const readAt = nowIso();
    stored.notifications = stored.notifications.map((notification) =>
      notification.readAt ? notification : { ...notification, readAt }
    );
  },
  resetPassword: async (token, input: ResetPasswordInput) => {
    const stored = resolveStoredUserFromToken(token);
    if (stored.password !== input.currentPassword) {
      throw new Error("Current password is incorrect.");
    }
    validatePassword(input.newPassword);
    stored.password = input.newPassword;
    createNotification(stored, "password", "Password updated", "Your password was changed successfully.");
  },
};

export const resetMockAuthUsers = (): void => {
  seedDefaults();
};
