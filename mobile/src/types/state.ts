export type AsyncStatus = "idle" | "loading" | "success" | "empty" | "error";

export type AsyncResourceState<T> = {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
};
