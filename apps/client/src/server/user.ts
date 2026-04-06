import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";

export const getMe = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return context.user;
  });

export const meOptions = () =>
  queryOptions({
    queryKey: ["user", "me"],
    queryFn: () => getMe(),
  });
