import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config.js";

const app = defineApp();

// Listing pagination: namespace=org_id, key=[status, elevator_number]
app.use(aggregate);

// Chart aggregates: each enables O(log n) grouped counts
app.use(aggregate, { name: "byDistrict" });
app.use(aggregate, { name: "byElevatorType" });
app.use(aggregate, { name: "byManufacturer" });
app.use(aggregate, { name: "byMaintenanceCompany" });
app.use(aggregate, { name: "byInspectionMonth" });
app.use(aggregate, { name: "byModernizationYear" }); // also tracks budget sums
app.use(aggregate, { name: "byBuildYear" }); // also tracks build_year sums for avg age

export default app;
