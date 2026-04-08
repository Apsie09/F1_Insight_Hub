export type AuthMode = "login" | "register";

export type AuthNotification = {
  id: number;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  displayName: string;
};

export type ResetPasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};
