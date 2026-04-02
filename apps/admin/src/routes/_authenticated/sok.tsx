import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { Search, MapPin, Building2, ArrowRight } from "lucide-react";

type SearchResult = {
  _id: string;
  hissnummer: string;
  adress?: string;
  organisationsnamn?: string;
};

export const Route = createFileRoute("/_authenticated/sok")({
  component: SokHiss,
});

function SokHiss() {
  const [input, setInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce ~300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(input);
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const results = useQuery(
    api.hissar.search,
    debouncedSearch.trim() ? { search: debouncedSearch.trim() } : "skip",
  ) as SearchResult[] | undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sök hiss</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sök efter hissnummer eller adress för att redigera en befintlig hiss.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Skriv hissnummer eller adress..."
          className="h-12 pl-10 text-base"
          autoFocus
        />
      </div>

      {debouncedSearch.trim() && results === undefined && (
        <p className="text-sm text-muted-foreground">Söker...</p>
      )}

      {results && results.length === 0 && debouncedSearch.trim() && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Search className="size-8" />
          <p>Inga hissar hittades för "{debouncedSearch.trim()}"</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {results.length} resultat
          </p>
          <div className="divide-y rounded-md border">
            {results.map((hiss) => (
              <Link
                key={hiss._id}
                to="/hiss/$id/redigera"
                params={{ id: hiss._id }}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium">{hiss.hissnummer}</p>
                  {hiss.adress && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{hiss.adress}</span>
                    </p>
                  )}
                  {hiss.organisationsnamn && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Building2 className="size-3 shrink-0" />
                      <span className="truncate">
                        {hiss.organisationsnamn}
                      </span>
                    </p>
                  )}
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
