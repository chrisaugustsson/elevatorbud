import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Building2 } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

export function OrgDisplay({
  organisationId,
}: {
  organisationId: Id<"organisationer">;
}) {
  const org = useQuery(api.organisationer.get, { id: organisationId });

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Building2 className="size-4" />
      <span className="font-medium text-foreground">
        {org?.namn ?? "Laddar..."}
      </span>
    </div>
  );
}
