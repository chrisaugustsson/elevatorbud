import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import * as user from "@elevatorbud/api/user";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getMe = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return context.user;
  });

export const getMeOptions = () =>
  queryOptions({
    queryKey: ["user", "me"],
    queryFn: () => getMe(),
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(user.listUsersSchema)
  .handler(async ({ data, context }) => {
    return user.list(context.db, data);
  });

export const listUsersOptions = (filters?: z.infer<typeof user.listUsersSchema>) =>
  queryOptions({
    queryKey: ["user", "list", filters],
    queryFn: () => listUsers({ data: filters }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const updateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(user.updateUserSchema)
  .handler(async ({ data, context }) => {
    return user.update(context.db, data);
  });

export const deactivateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return user.deactivate(context.db, data.id);
  });

export const activateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return user.activate(context.db, data.id);
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(user.createUserSchema)
  .handler(async ({ data, context }) => {
    return user.create(context.db, data);
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return user.deleteUser(context.db, data.id);
  });
