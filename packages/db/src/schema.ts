import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  uuid,
  index,
  unique,
  jsonb,
  numeric,
  check,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ─── Organizations ───────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    organizationNumber: text("organization_number"),
    // Self-reference: use AnyPgColumn to break the circular type reference
    // instead of `: any`. This is the Drizzle-recommended pattern.
    //
    // Hierarchy depth (one level) is enforced by the DB trigger
    // `enforce_one_level_org_hierarchy` in migration 0002. Residual race under
    // concurrent writes at READ COMMITTED: two simultaneous transactions could
    // each pass the "target parent has no parent" / "this org has no children"
    // checks and produce a 2-level chain. Acceptable for admin-app traffic
    // (low concurrency, small number of admin users). If concurrent org edits
    // become real, upgrade the trigger to `SELECT ... FOR UPDATE` on the
    // target parent row inside the transaction.
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => organizations.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("organizations_parent_id_idx").on(t.parentId)],
);

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
    index("user_organizations_user_id_idx").on(t.userId),
    index("user_organizations_organization_id_idx").on(t.organizationId),
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
    propertyDesignation: text("property_designation"),
    inventoryDate: text("inventory_date"),

    // Core technical (used in charts/filtering)
    elevatorType: text("elevator_type"),
    manufacturer: text("manufacturer"),
    buildYear: integer("build_year"),

    // Inspection and maintenance
    inspectionAuthority: text("inspection_authority"),
    // Month of the annual statutory inspection (1=Januari … 12=December).
    // Imported values are normalized via parseInspectionMonth — the Excel
    // column can hold Swedish names ("Maj"), short forms ("maj"), or
    // numeric strings. The CHECK constraint below enforces the range at
    // the DB level so a bad direct SQL write can't corrupt the column.
    inspectionMonth: integer("inspection_month"),
    maintenanceCompany: text("maintenance_company"),

    // Modernization (historical — when it WAS modernized)
    modernizationYear: text("modernization_year"),
    // Warranty expiration date for the most recent modernization. NULL
    // when there's no warranty data, the warranty is unknown, or the
    // import value couldn't be parsed as a date (the Excel column also
    // contains sentinel strings like "Ja"/"Nej"/"?"/"okänt" — we only
    // store dates).
    warrantyExpiresAt: date("warranty_expires_at"),

    // Emergency phone (summary flags for charts)
    hasEmergencyPhone: boolean("has_emergency_phone"),
    needsUpgrade: boolean("needs_upgrade"),

    // Contact person
    contactPersonName: text("contact_person_name"),
    contactPersonPhone: text("contact_person_phone"),
    contactPersonEmail: text("contact_person_email"),

    // Flexible per-customer columns. Keys correspond to
    // custom_field_defs.key; the import auto-matches Excel headers to
    // defs (or creates new ones) and stores values here. Non-null with
    // default '{}' so reads never need a null-check.
    //
    // `any` at the DB layer is intentional for the same reason as
    // `elevator_events.metadata` — TanStack Start's server-fn return-type
    // serializer rejects `Record<string, unknown>` at the RPC boundary.
    // Callers narrow to `Record<string, unknown>` at use-site.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customFields: jsonb("custom_fields").$type<any>().notNull().default({}),

    // Metadata
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    status: text("status", { enum: ["active", "demolished", "archived"] })
      .notNull()
      .default("active"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUpdatedBy: uuid("last_updated_by").references(() => users.id, { onDelete: "set null" }),
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
    index("elevators_custom_fields_gin_idx").using("gin", t.customFields),
    // (organization_id, elevator_number) is unique — re-imports and edits
    // both rely on this to detect duplicates. The plain index on
    // elevator_number above is kept for cross-org search.
    unique("elevators_organization_id_elevator_number_unique").on(
      t.organizationId,
      t.elevatorNumber,
    ),
    check("elevators_status_check", sql`${t.status} IN ('active', 'demolished', 'archived')`),
    check("elevators_build_year_check", sql`${t.buildYear} IS NULL OR (${t.buildYear} >= 1800 AND ${t.buildYear} <= 2100)`),
    check(
      "elevators_inspection_month_check",
      sql`${t.inspectionMonth} IS NULL OR (${t.inspectionMonth} >= 1 AND ${t.inspectionMonth} <= 12)`,
    ),
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
  events: many(elevatorEvents),
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

    // Emergency phone description. Free-text copy of the Excel
    // "Nödtelefon" cell after its "Ja, " prefix — e.g. "Safeline, PSTN
    // utan pictogram, Modell, SL2000". Null when the cell was "Nej" or
    // empty. `elevators.hasEmergencyPhone` carries the Ja/Nej flag for
    // charts; this column carries the detail. The earlier split into
    // `emergencyPhoneModel` + `emergencyPhoneType` was over-engineered —
    // brand/type/model order varies too much across customers for
    // structured parsing to be reliable.
    emergencyPhone: text("emergency_phone"),
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

// ─── Elevator Budgets (planned modernizations) ───────────────────────────────

export const elevatorBudgets = pgTable(
  "elevator_budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    elevatorId: uuid("elevator_id")
      .notNull()
      .references(() => elevators.id, { onDelete: "cascade" }),
    recommendedModernizationYear: text("recommended_modernization_year"),
    budgetAmount: numeric("budget_amount", { precision: 12, scale: 2 }),
    measures: text("measures"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("elevator_budgets_elevator_id_idx").on(t.elevatorId)],
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

// ─── Elevator Events (append-only history / timeline) ───────────────────────
//
// Event-sourced record of everything that happens to an elevator in the real
// world: inventory surveys, inspections, modernizations, repairs, free-form
// notes. The `elevators` row keeps "current state" (latest inventoryDate,
// latest modernizationYear) as denormalized caches for list/filter queries;
// `elevator_events` is the source of truth for history and cost tracking.
//
// Event rows are editable (typo fixes) but never deleted once the elevator
// lifetime matters: use `elevators.status = 'archived'` to hide an elevator
// instead of removing its event history.

export const ELEVATOR_EVENT_TYPES = [
  "inventory",
  "inspection",
  "repair",
  "service",
  "modernization",
  "replacement",
  "note",
] as const;

export type ElevatorEventType = (typeof ELEVATOR_EVENT_TYPES)[number];

export const elevatorEvents = pgTable(
  "elevator_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    elevatorId: uuid("elevator_id")
      .notNull()
      .references(() => elevators.id, { onDelete: "cascade" }),

    type: text("type", { enum: ELEVATOR_EVENT_TYPES }).notNull(),

    // When it happened in the real world (NOT when it was recorded).
    // Date-only is fine for this domain; we keep it as a timestamp so the
    // timeline can sort and so future sub-day events (repairs with a time)
    // don't need another migration.
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),

    title: text("title").notNull(),
    description: text("description"),

    cost: numeric("cost", { precision: 12, scale: 2 }),
    currency: text("currency").default("SEK"),

    // Free-text supplier / inspector / technician name
    performedBy: text("performed_by"),

    // Type-specific fields live here. Shape is validated in app code per
    // type (see apps/*/server/elevator-events.ts). Examples:
    //   inspection:    { authority, result, nextDue }
    //   modernization: { parts: [...], warrantyYears }
    //   repair:        { component, downtimeHours }
    //   replacement:   { previousManufacturer, previousBuildYear, ... }
    //
    // `any` at the DB layer is intentional — TanStack Start's server-fn
    // return-type serializer and drizzle's insert-value check disagree on
    // every stricter variant (`unknown`, `Record<string, unknown>`,
    // `Record<string, {}>`). `any` is assignable in both directions and
    // keeps the RPC boundary happy. The shape is validated per event
    // type in app code (see apps/*/server/elevator-events.ts).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: jsonb("metadata").$type<any>(),

    // Future-proofing for inspection PDFs etc. Storage backend (S3-compatible)
    // to be decided when the first attachment feature ships.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attachments: jsonb("attachments").$type<any>(),

    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Pragmatic edits: owner can fix typos; we record who/when but don't
    // version the row. If strict immutability is needed later, add a
    // correction-event pattern (reference the original by id).
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (t) => [
    index("elevator_events_elevator_id_idx").on(t.elevatorId),
    index("elevator_events_elevator_id_occurred_at_idx").on(
      t.elevatorId,
      t.occurredAt.desc(),
    ),
    index("elevator_events_type_idx").on(t.type),
    index("elevator_events_occurred_at_idx").on(t.occurredAt),
    check(
      "elevator_events_type_check",
      sql`${t.type} IN ('inventory','inspection','repair','service','modernization','replacement','note')`,
    ),
    check(
      "elevator_events_cost_nonneg",
      sql`${t.cost} IS NULL OR ${t.cost} >= 0`,
    ),
  ],
);

export const elevatorEventsRelations = relations(elevatorEvents, ({ one }) => ({
  elevator: one(elevators, {
    fields: [elevatorEvents.elevatorId],
    references: [elevators.id],
  }),
  createdByUser: one(users, {
    fields: [elevatorEvents.createdBy],
    references: [users.id],
    relationName: "eventCreatedByUser",
  }),
  updatedByUser: one(users, {
    fields: [elevatorEvents.updatedBy],
    references: [users.id],
    relationName: "eventUpdatedByUser",
  }),
}));

// ─── Custom Field Definitions ────────────────────────────────────────────────
//
// Global catalog of user-defined columns found on imported Excel sheets.
// The import auto-matches a header (e.g. "Verksamhet") against `key` or
// `aliases`; unmatched headers become new defs after the admin confirms
// label/type in the import UI. Values live in `elevators.customFields`
// keyed by `key`. Global (not per-org) because the same label means the
// same thing across customers, and each customer only ever sees their
// own elevators — no cross-tenant leakage is possible from sharing defs.

export const CUSTOM_FIELD_TYPES = ["text", "number", "boolean", "date"] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const customFieldDefs = pgTable(
  "custom_field_defs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type", { enum: CUSTOM_FIELD_TYPES }).notNull().default("text"),
    // Known header variants that should auto-match to this def on future
    // imports. Admin-confirmed matches append to this list.
    aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("custom_field_defs_key_unique").on(t.key),
    index("custom_field_defs_key_idx").on(t.key),
    check(
      "custom_field_defs_type_check",
      sql`${t.type} IN ('text','number','boolean','date')`,
    ),
  ],
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
