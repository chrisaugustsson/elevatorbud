import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSelectedOrg } from "../lib/org-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Building2 } from "lucide-react";

export function OrgSelector() {
  const orgs = useQuery(api.organisationer.list);
  const { selectedOrgId, setSelectedOrgId } = useSelectedOrg();

  return (
    <Select
      value={selectedOrgId ?? "all"}
      onValueChange={(value) =>
        setSelectedOrgId(value === "all" ? null : value)
      }
    >
      <SelectTrigger size="sm" className="w-[220px]">
        <Building2 className="size-4 text-muted-foreground" />
        <SelectValue placeholder="Alla organisationer" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Alla organisationer</SelectItem>
        {orgs?.map((org: { _id: string; namn: string }) => (
          <SelectItem key={org._id} value={org._id}>
            {org.namn}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
