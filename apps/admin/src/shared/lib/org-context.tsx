import * as React from "react";

type OrgContextValue = {
  selectedOrgId: string | null;
  setSelectedOrgId: (id: string | null) => void;
};

const OrgContext = React.createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrgId, setSelectedOrgId] = React.useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("admin_selected_org") ?? null;
    },
  );

  const handleSetOrgId = React.useCallback((id: string | null) => {
    setSelectedOrgId(id);
    if (typeof window !== "undefined") {
      if (id) {
        localStorage.setItem("admin_selected_org", id);
      } else {
        localStorage.removeItem("admin_selected_org");
      }
    }
  }, []);

  const value = React.useMemo(
    () => ({ selectedOrgId, setSelectedOrgId: handleSetOrgId }),
    [selectedOrgId, handleSetOrgId],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useSelectedOrg() {
  const ctx = React.useContext(OrgContext);
  if (!ctx) throw new Error("useSelectedOrg must be used within OrgProvider");
  return ctx;
}
