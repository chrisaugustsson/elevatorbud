import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  index,
  unique,
  jsonb,
  numeric,
  check,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Organizations ───────────────────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  organizationNumber: text("organization_number"),
  contactPerson: text("contact_person"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  parentId: uuid("parent_id").references((): any => organizations.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    parent: one(organizations, {
      fields: [organizations.parentId],
      references: [organizations.id],
      relationName: "parentChild",
    }),
    children: many(organizations, { relationName: "parentChild" }),
    elevators: many(elevators),
    userOrganizations: many(userOrganizations),
  }),
);

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role", { enum: ["admin", "customer"] })
      .notNull()
      .default("customer"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLogin: timestamp("last_login", { withTimezone: true }),
  },
  (t) => [
    unique("users_clerk_user_id_unique").on(t.clerkUserId),
    unique("users_email_unique").on(t.email),
    index("users_role_idx").on(t.role),
    check("users_role_check", sql`${t.role} IN ('admin', 'customer')`),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  userOrganizations: many(userOrganizations),
}));

// ─── User–Organization join table ───────────────────────────────────────────

export const userOrganizations = pgTable(
  "user_organizations",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.organizationId] }),
  ],
);

export const userOrganizationsRelations = relations(
  userOrganizations,
  ({ one }) => ({
    user: one(users, {
      fields: [userOrganizations.userId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [userOrganizations.organizationId],
      references: [organizations.id],
    }),
  }),
);

// ─── Elevators (core) ────────────────────────────────────────────────────────

export const elevators = pgTable(
  "elevators",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identification
    elevatorNumber: text("elevator_number").notNull(),
    address: text("address"),
    elevatorClassification: text("elevator_classification"),
    district: text("district"),
    inventoryDate: text("inventory_date"),

    // Core technical (used in charts/filtering)
    elevatorType: text("elevator_type"),
    manufacturer: text("manufacturer"),
    buildYear: integer("build_year"),

    // Inspection and maintenance
    inspectionAuthority: text("inspection_authority"),
    inspectionMonth: text("inspection_month"),
    maintenanceCompany: text("maintenance_company"),

    // Modernization (historical — when it WAS modernized)
    modernizationYear: text("modernization_year"),

    // Emergency phone (summary flags for charts)
    hasEmergencyPhone: boolean("has_emergency_phone"),
    needsUpgrade: boolean("needs_upgrade"),

    // Metadata
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    status: text("status", { enum: ["active", "demolished", "archived"] })
      .notNull()
      .default("active"),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUpdatedBy: uuid("last_updated_by").references(() => users.id),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }),
  },
  (t) => [
    index("elevators_organization_id_idx").on(t.organizationId),
    index("elevators_elevator_number_idx").on(t.elevatorNumber),
    index("elevators_organization_id_status_idx").on(
      t.organizationId,
      t.status,
    ),
    index("elevators_district_idx").on(t.district),
    index("elevators_manufacturer_idx").on(t.manufacturer),
    index("elevators_elevator_type_idx").on(t.elevatorType),
    check("elevators_status_check", sql`${t.status} IN ('active', 'demolished', 'archived')`),
    check("elevators_build_year_check", sql`${t.buildYear} IS NULL OR (${t.buildYear} >= 1800 AND ${t.buildYear} <= 2100)`),
  ],
);

export const elevatorsRelations = relations(elevators, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [elevators.organizationId],
    references: [organizations.id],
  }),
  createdByUser: one(users, {
    fields: [elevators.createdBy],
    references: [users.id],
    relationName: "createdByUser",
  }),
  lastUpdatedByUser: one(users, {
    fields: [elevators.lastUpdatedBy],
    references: [users.id],
    relationName: "lastUpdatedByUser",
  }),
  details: one(elevatorDetails),
  budgets: many(elevatorBudgets),
}));

// ─── Elevator Details (technical specs) ──────────────────────────────────────

export const elevatorDetails = pgTable(
  "elevator_details",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    elevatorId: uuid("elevator_id")
      .notNull()
      .references(() => elevators.id, { onDelete: "cascade" })
      .unique(),

    // Technical specification
    speed: text("speed"),
    liftHeight: text("lift_height"),
    loadCapacity: text("load_capacity"),
    floorCount: integer("floor_count"),
    doorCount: integer("door_count"),

    // Doors and cab
    doorType: text("door_type"),
    passthrough: boolean("passthrough"),
    dispatchMode: text("dispatch_mode"),
    cabSize: text("cab_size"),
    doorOpening: text("door_opening"),
    doorCarrier: text("door_carrier"),
    doorMachine: text("door_machine"),

    // Machinery
    driveSystem: text("drive_system"),
    suspension: text("suspension"),
    machinePlacement: text("machine_placement"),
    machineType: text("machine_type"),
    controlSystemType: text("control_system_type"),

    // Inspection detail
    shaftLighting: text("shaft_lighting"),

    // Emergency phone details
    emergencyPhoneModel: text("emergency_phone_model"),
    emergencyPhoneType: text("emergency_phone_type"),
    emergencyPhonePrice: numeric("emergency_phone_price", { precision: 10, scale: 2 }),

    // Comments
    comments: text("comments"),
  },
  (t) => [index("elevator_details_elevator_id_idx").on(t.elevatorId)],
);

export const elevatorDetailsRelations = relations(
  elevatorDetails,
  ({ one }) => ({
    elevator: one(elevators, {
      fields: [elevatorDetails.elevatorId],
      references: [elevators.id],
    }),
  }),
);

// ─── Elevator Budgets (revision history) ─────────────────────────────────────

export const elevatorBudgets = pgTable(
  "elevator_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    elevatorId: uuid("elevator_id")
      .notNull()
      .references(() => elevators.id, { onDelete: "cascade" }),
    revisionYear: integer("revision_year").notNull(),
    recommendedModernizationYear: text("recommended_modernization_year"),
    budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
    measures: text("measures"),
    warranty: boolean("warranty"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id),
  },
  (t) => [
    index("elevator_budgets_elevator_id_idx").on(t.elevatorId),
    index("elevator_budgets_elevator_id_revision_year_idx").on(
      t.elevatorId,
      t.revisionYear,
    ),
  ],
);

export const elevatorBudgetsRelations = relations(
  elevatorBudgets,
  ({ one }) => ({
    elevator: one(elevators, {
      fields: [elevatorBudgets.elevatorId],
      references: [elevators.id],
    }),
    createdByUser: one(users, {
      fields: [elevatorBudgets.createdBy],
      references: [users.id],
    }),
  }),
);

// ─── Suggested Values (reference data) ───────────────────────────────────────

export const suggestedValues = pgTable(
  "suggested_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    category: text("category").notNull(),
    value: text("value").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("suggested_values_category_idx").on(t.category),
    unique("suggested_values_category_value_unique").on(t.category, t.value),
  ],
);

// ─── Contact Submissions ─────────────────────────────────────────────────────

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message").notNull(),
    status: text("status", { enum: ["new", "read", "archived"] })
      .notNull()
      .default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("contact_submissions_status_idx").on(t.status),
    check("contact_submissions_status_check", sql`${t.status} IN ('new', 'read', 'archived')`),
  ],
);

// ─── Pages (CMS) ────────────────────────────────────────────────────────────

export type PageSection = {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  content?: string;
  items?: { title?: string; description?: string; icon?: string }[];
  cta?: { text: string; href: string };
  imageUrl?: string;
  order: number;
};

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    sections: jsonb("sections").$type<PageSection[]>().notNull().default([]),
    published: boolean("published").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [index("pages_slug_idx").on(t.slug)],
);
