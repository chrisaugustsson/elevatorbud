export type User = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  organizationId: string | null;
  active: boolean;
};
