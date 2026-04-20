import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddlewareRead } from "./auth";

export const getMe = createServerFn()
  .middleware([authMiddlewareRead])
  .handler(async ({ context }) => {
    return context.user;
  });

// Catch the "Ej autentiserad" throw from authMiddleware and surface it as
// null so the authenticated layout can render a sign-out escape hatch when
// the user is Clerk-authed but has no DB row yet (e.g., after a data wipe
// or before the user.created webhook fires).
export const meOptions = () =>
  queryOptions({
    queryKey: ["user", "me"],
    queryFn: async () => {
      try {
        return await getMe();
      } catch {
        return null;
      }
    },
  });
