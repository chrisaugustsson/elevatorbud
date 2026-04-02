import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
} from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";

export const Route = createFileRoute("/_authenticated/")({
  component: DailyOverview,
});

type DagensHiss = {
  _id: string;
  hissnummer: string;
  adress?: string;
  organisationsnamn?: string;
  skapad_datum: number;
  senast_uppdaterad?: number;
};

function getTodayStart(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function getDraftIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("draft-hiss-")) {
        ids.push(key.replace("draft-hiss-", ""));
      }
    }
  } catch {
    // localStorage unavailable
  }
  return ids;
}

function hasNewDraft(): boolean {
  try {
    return localStorage.getItem("draft-ny-hiss") !== null;
  } catch {
    return false;
  }
}

function DailyOverview() {
  const [todayStart] = useState(getTodayStart);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [newDraft, setNewDraft] = useState(false);

  const dagensHissar = useQuery(api.hissar.dagensHissar, { todayStart }) as
    | DagensHiss[]
    | undefined;

  useEffect(() => {
    setDraftIds(getDraftIds());
    setNewDraft(hasNewDraft());
  }, []);

  const draftIdSet = new Set(draftIds);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dagens arbete</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("sv-SE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Primary action - Ny hiss */}
      <Link to="/ny" className="block">
        <Button className="h-14 w-full gap-3 text-lg font-semibold">
          <Plus className="h-6 w-6" />
          Ny hiss
        </Button>
      </Link>

      {/* New draft indicator */}
      {newDraft && (
        <Link to="/ny" className="block">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-amber-900">
                  Pågående utkast
                </p>
                <p className="text-sm text-amber-700">
                  Du har ett sparat utkast för ny hiss
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Dagens hissar */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Dagens hissar
        </h2>

        {dagensHissar === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : dagensHissar.length === 0 && draftIds.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Inga hissar registrerade eller redigerade idag
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dagensHissar.map((hiss) => (
              <Link
                key={hiss._id}
                to="/hiss/$id/redigera"
                params={{ id: hiss._id }}
                className="block"
              >
                <Card className="transition-colors hover:bg-accent/50">
                  <CardContent className="flex items-center gap-3 p-4">
                    {draftIdSet.has(hiss._id) ? (
                      <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {hiss.hissnummer}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                        {hiss.adress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {hiss.adress}
                          </span>
                        )}
                        {hiss.organisationsnamn && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {hiss.organisationsnamn}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* Show edit drafts for hissar NOT in today's server list */}
            {draftIds
              .filter(
                (id) => !dagensHissar.some((h) => h._id === id),
              )
              .map((id) => (
                <Link
                  key={id}
                  to="/hiss/$id/redigera"
                  params={{ id }}
                  className="block"
                >
                  <Card className="border-amber-200 bg-amber-50/50 transition-colors hover:bg-amber-50">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-amber-900">
                          Utkast
                        </p>
                        <p className="text-sm text-amber-700">
                          Osparade ändringar
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Secondary action - Sök */}
      <Link to="/sok" className="block">
        <Button
          variant="outline"
          className="h-12 w-full gap-2 text-base"
        >
          <Search className="h-5 w-5" />
          Sök befintlig hiss
        </Button>
      </Link>
    </div>
  );
}
