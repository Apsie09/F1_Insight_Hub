import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "../types/auth";
import type { AuthService } from "../types/services";

type StoredUser = {
  user: AuthUser;
  password: string;
};

const DEFAULT_USER: StoredUser = {
  user: {
    id: 1,
    email: "demo@f1insighthub.dev",
    displayName: "Demo User",
  },
  password: "DemoPass!123",
};

let nextUserId = 2;
const usersByEmail = new Map<string, StoredUser>();

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const seedDefaults = () => {
  usersByEmail.clear();
  usersByEmail.set(DEFAULT_USER.user.email, DEFAULT_USER);
  nextUserId = 2;
};

seedDefaults();

const buildResponse = (user: AuthUser): AuthResponse => ({
  token: `mock-token-${user.id}-${Date.now()}`,
  user,
});

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

  const user: AuthUser = {
    id: nextUserId,
    email: normalizedEmail,
    displayName: input.displayName.trim() || normalizedEmail.split("@")[0],
  };
  nextUserId += 1;

  usersByEmail.set(normalizedEmail, {
    user,
    password: input.password,
  });

  return buildResponse(user);
};

export const mockAuthService: AuthService = {
  login,
  register,
};

export const resetMockAuthUsers = (): void => {
  seedDefaults();
};
