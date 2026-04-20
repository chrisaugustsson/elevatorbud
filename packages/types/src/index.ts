export type User = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  organizationIds: string[];
  active: boolean;
};
