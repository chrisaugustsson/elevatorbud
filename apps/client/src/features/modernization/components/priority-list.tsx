import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Building2, ChevronRight } from "lucide-react";
import type { TimelinePeriod } from "./urgency-helpers";
import { getUrgencyBadge } from "./urgency-helpers";

type PriorityElevator = {
  _id: string;
  elevator_number: string;
  address?: string;
  district?: string;
  recommended_modernization_year?: string;
  budget_amount?: number;
  modernization_measures?: string;
};

type PriorityListProps = {
  elevators: PriorityElevator[];
  selectedPeriod: TimelinePeriod | null;
  onClearPeriod: () => void;
};

export function PriorityList({
  elevators,
  selectedPeriod,
  onClearPeriod,
}: PriorityListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Prioritetslista
          {selectedPeriod && (
            <Badge variant="outline" className="ml-2 font-normal">
              {selectedPeriod.label}
              <button
                className="ml-1 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearPeriod();
                }}
              >
                ×
              </button>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {elevators.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Inga hissar med rekommenderat moderniseringsår
            {selectedPeriod ? " i vald period" : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hissnummer</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Adress
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Distrikt
                  </TableHead>
                  <TableHead>Rek. år</TableHead>
                  <TableHead>Brådskande</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Budget
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Åtgärd
                  </TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {elevators.map((h) => {
                  const year = parseInt(
                    h.recommended_modernization_year || "0",
                    10,
                  );
                  return (
                    <TableRow key={h._id}>
                      <TableCell className="font-medium">
                        {h.elevator_number}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {h.address || "–"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {h.district || "–"}
                      </TableCell>
                      <TableCell>{h.recommended_modernization_year}</TableCell>
                      <TableCell>{getUrgencyBadge(year)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {h.budget_amount
                          ? `${h.budget_amount.toLocaleString("sv-SE")} kr`
                          : "–"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {h.modernization_measures || "–"}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/hiss/${h._id}`}
                          className="inline-flex items-center text-muted-foreground hover:text-foreground"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
