import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listOrganizationsOptions } from "~/server/organization";
import { useForm } from "@tanstack/react-form";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@elevatorbud/ui/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@elevatorbud/ui/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@elevatorbud/ui/components/ui/collapsible";
import {
  Plus,
  X,
  ChevronRight,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

export type EditableUser = {
  id: string;
  clerkUserId: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  active: boolean;
  createdAt: Date;
  lastLogin: Date | null;
  userOrganizations: Array<{
    userId: string;
    organizationId: string;
    createdAt: Date;
    organization: {
      id: string;
      name: string;
      organizationNumber: string | null;
      parentId: string | null;
      createdAt: Date;
    };
  }>;
};

type Organisation = {
  id: string;
  name: string;
  parentId: string | null;
};

export type EditUserSubmitValues = {
  id: string;
  name?: string;
  email?: string;
  role?: "admin" | "customer";
  organizationIds?: string[];
};

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  allOrgs,
  contextOrgId,
}: {
  user: EditableUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditUserSubmitValues) => Promise<void>;
  /**
   * Optional pre-loaded org list. If omitted, the dialog fetches
   * listOrganizationsOptions internally.
   */
  allOrgs?: Organisation[];
  /**
   * Optional org context when the dialog is opened from an organization
   * detail page. Not used for filtering (kept for future UX hints) but
   * forwarded so callers can pass it through without deriving it inside.
   */
  contextOrgId?: string;
}) {
  if (!user || !open) return null;

  return (
    <EditUserDialogInner
      key={user.id}
      user={user}
      allOrgs={allOrgs}
      contextOrgId={contextOrgId}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

function EditUserDialogInner({
  user,
  allOrgs: allOrgsProp,
  contextOrgId: _contextOrgId,
  onOpenChange,
  onSubmit,
}: {
  user: EditableUser;
  allOrgs?: Organisation[];
  contextOrgId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditUserSubmitValues) => Promise<void>;
}) {
  // Fetch if not supplied by parent. Returns cached data when the list has
  // already been prefetched/used elsewhere.
  const { data: fetchedOrgs } = useQuery({
    ...listOrganizationsOptions(),
    enabled: !allOrgsProp,
  });
  const allOrgs: Organisation[] = allOrgsProp ?? fetchedOrgs ?? [];

  const initialOrgIds = user.userOrganizations.map((uo) => uo.organizationId);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>(initialOrgIds);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);

  const orgMap = useMemo(() => {
    const m = new Map<string, Organisation>();
    for (const org of allOrgs) m.set(org.id, org);
    return m;
  }, [allOrgs]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, Organisation[]>();
    for (const org of allOrgs) {
      if (org.parentId) {
        const list = m.get(org.parentId) || [];
        list.push(org);
        m.set(org.parentId, list);
      }
    }
    return m;
  }, [allOrgs]);

  const inheritedOrgs = useMemo(() => {
    const inherited: Array<{ org: Organisation; viaParentName: string }> = [];
    for (const directId of selectedOrgIds) {
      const children = childrenByParent.get(directId) || [];
      const parentOrg = orgMap.get(directId);
      for (const child of children) {
        if (!selectedOrgIds.includes(child.id)) {
          inherited.push({ org: child, viaParentName: parentOrg?.name ?? "" });
        }
      }
    }
    return inherited;
  }, [selectedOrgIds, childrenByParent, orgMap]);

  // FR-33: exclude any org whose parentId is in selectedOrgIds (children
  // of selected) AND any org that is the parentId of a selected org
  // (ancestors of selected). Prevents direct grants on both a parent and
  // one of its children.
  const availableOrgs = useMemo(() => {
    const parentIdsOfSelected = new Set<string>();
    for (const id of selectedOrgIds) {
      const org = orgMap.get(id);
      if (org?.parentId) parentIdsOfSelected.add(org.parentId);
    }
    return allOrgs.filter((org) => {
      if (selectedOrgIds.includes(org.id)) return false;
      if (org.parentId && selectedOrgIds.includes(org.parentId)) return false;
      if (parentIdsOfSelected.has(org.id)) return false;
      return true;
    });
  }, [allOrgs, selectedOrgIds, orgMap]);

  const handleAddOrg = (orgId: string) => {
    setSelectedOrgIds((prev) => [...prev, orgId]);
    setOrgPickerOpen(false);
  };

  const handleRemoveOrg = (orgId: string) => {
    const org = orgMap.get(orgId);
    const children = childrenByParent.get(orgId) || [];
    const lostChildren = children.filter((c) => !selectedOrgIds.includes(c.id));

    setSelectedOrgIds((prev) => prev.filter((id) => id !== orgId));

    if (lostChildren.length > 0) {
      toast.info(
        `Åtkomst borttagen för ${org?.name ?? "organisation"} och ${lostChildren.length} underorganisation${lostChildren.length > 1 ? "er" : ""}: ${lostChildren.map((c) => c.name).join(", ")}`,
      );
    }
  };

  const form = useForm({
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role as "admin" | "customer",
    },
    onSubmit: async ({ value }) => {
      await onSubmit({
        id: user.id,
        name: value.name,
        email: value.email,
        role: value.role,
        organizationIds: value.role === "customer" ? selectedOrgIds : [],
      });
      form.reset();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Redigera användare</DialogTitle>
          <DialogDescription>
            Ändra uppgifter för {user.name}.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) =>
                !value.trim() ? "Namn krävs" : undefined,
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  Namn <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Förnamn Efternamn"
                  aria-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  }
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {error}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) return "E-post krävs";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
                  return "Ogiltig e-postadress";
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>
                  E-post <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="namn@foretag.se"
                  aria-invalid={
                    field.state.meta.isTouched &&
                    field.state.meta.errors.length > 0
                  }
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((error, i) => (
                    <p key={i} className="text-sm text-destructive">
                      {error}
                    </p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="space-y-2">
                <Label>
                  Roll <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={field.state.value}
                  onValueChange={(val) => {
                    field.handleChange(val as "admin" | "customer");
                    if (val === "admin") {
                      setSelectedOrgIds([]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="customer">Kund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.role}>
            {(role) =>
              role === "customer" ? (
                <div className="space-y-3">
                  <Label>Organisationer</Label>

                  <p className="text-xs text-muted-foreground">
                    Effektiv åtkomst: {selectedOrgIds.length + inheritedOrgs.length} organisationer
                  </p>

                  {selectedOrgIds.length > 0 && (
                    <div className="space-y-1">
                      {selectedOrgIds.map((orgId) => {
                        const org = orgMap.get(orgId);
                        const children = childrenByParent.get(orgId) || [];
                        const impliedChildren = children.filter((c) => !selectedOrgIds.includes(c.id));
                        return (
                          <div key={orgId} className="space-y-1">
                            {impliedChildren.length > 0 ? (
                              <Collapsible>
                                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                                  <CollapsibleTrigger asChild>
                                    <button
                                      type="button"
                                      className="rounded-sm p-0.5 hover:bg-accent"
                                      aria-label={`Visa underorganisationer för ${org?.name}`}
                                    >
                                      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                                    </button>
                                  </CollapsibleTrigger>
                                  <LinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                  <span className="text-sm font-medium flex-1 truncate">{org?.name ?? orgId}</span>
                                  <Badge variant="default" className="text-xs shrink-0">Direkt</Badge>
                                  <span className="text-xs text-muted-foreground shrink-0">+{impliedChildren.length}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOrg(orgId)}
                                    className="rounded-sm p-0.5 hover:bg-accent"
                                    aria-label={`Ta bort ${org?.name}`}
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                </div>
                                <CollapsibleContent>
                                  <div className="ml-6 mt-1 space-y-1">
                                    {impliedChildren.map((child) => (
                                      <div key={child.id} className="flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5">
                                        <Unlink
                                          className="mr-1 size-4 shrink-0 text-muted-foreground"
                                          aria-hidden="true"
                                        />
                                        <span className="text-sm flex-1 truncate text-muted-foreground">{child.name}</span>
                                        <Badge variant="outline" className="text-xs shrink-0">
                                          <span className="sr-only">Ärvd åtkomst </span>
                                          via {org?.name}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            ) : (
                              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                                <LinkIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                <span className="text-sm font-medium flex-1 truncate">{org?.name ?? orgId}</span>
                                <Badge variant="default" className="text-xs shrink-0">Direkt</Badge>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrg(orgId)}
                                  className="rounded-sm p-0.5 hover:bg-accent"
                                  aria-label={`Ta bort ${org?.name}`}
                                >
                                  <X className="size-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedOrgIds.length === 0 && (
                    <p className="text-sm text-muted-foreground">Inga organisationer tilldelade.</p>
                  )}

                  <Popover open={orgPickerOpen} onOpenChange={setOrgPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        role="combobox"
                        aria-expanded={orgPickerOpen}
                      >
                        <Plus className="size-4 mr-1" />
                        Lägg till organisation
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Sök organisation..." />
                        <CommandList>
                          <CommandEmpty>Inga organisationer hittades.</CommandEmpty>
                          <CommandGroup>
                            {availableOrgs.map((org) => (
                              <CommandItem
                                key={org.id}
                                value={org.name}
                                onSelect={() => handleAddOrg(org.id)}
                              >
                                {org.name}
                                {org.parentId && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (under {orgMap.get(org.parentId)?.name})
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : null
            }
          </form.Subscribe>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Sparar..." : "Spara"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
