export type AuthMode = "login" | "register";

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

export type AuthSession = {
  token: string;
  user: AuthUser;
};
