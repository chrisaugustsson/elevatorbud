import { useQuery } from "@tanstack/react-query";
import { organizationOptions } from "../../server/organization";
import { Building2 } from "lucide-react";

export function OrgDisplay({
  organisationId,
}: {
  organisationId: string;
}) {
  const { data: org } = useQuery(organizationOptions(organisationId));

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Building2 className="size-4" />
      <span className="font-medium text-foreground">
        {org?.name ?? "Laddar..."}
      </span>
    </div>
  );
}
