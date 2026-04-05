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
import { Phone, PhoneOff, ArrowUpCircle } from "lucide-react";
import type { NodData } from "../types";

export function EmergencyPhoneStatus({ nodData }: { nodData: NodData }) {
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Phone className="h-5 w-5" />
        Nödtelefonstatus
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-green-600" />
              Med nödtelefon
            </div>
            <div className="mt-1 text-2xl font-bold">
              {nodData.withEmergencyPhone}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PhoneOff className="h-4 w-4 text-red-600" />
              Utan nödtelefon
            </div>
            <div className="mt-1 text-2xl font-bold">
              {nodData.withoutEmergencyPhone}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpCircle className="h-4 w-4 text-orange-500" />
              Behöver uppgradering
            </div>
            <div className="mt-1 text-2xl font-bold">
              {nodData.needsUpgrade}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Total uppgraderingskostnad
            </div>
            <div className="mt-1 text-2xl font-bold">
              {nodData.totalUpgradeCost.toLocaleString("sv-SE")} kr
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per district table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Nödtelefonstatus per distrikt
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nodData.byDistrict.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Ingen data tillgänglig.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distrikt</TableHead>
                    <TableHead className="text-center">Med</TableHead>
                    <TableHead className="text-center">Utan</TableHead>
                    <TableHead className="text-center">
                      Uppgradering
                    </TableHead>
                    <TableHead className="text-right">Kostnad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodData.byDistrict.map((d) => (
                    <TableRow key={d.district}>
                      <TableCell className="font-medium">
                        {d.district}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          {d.with}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {d.without > 0 ? (
                          <Badge variant="destructive">{d.without}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.upgrade > 0 ? (
                          <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                            {d.upgrade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {d.cost > 0
                          ? `${d.cost.toLocaleString("sv-SE")} kr`
                          : "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Totalt</TableCell>
                    <TableCell className="text-center">
                      {nodData.withEmergencyPhone}
                    </TableCell>
                    <TableCell className="text-center">
                      {nodData.withoutEmergencyPhone}
                    </TableCell>
                    <TableCell className="text-center">
                      {nodData.needsUpgrade}
                    </TableCell>
                    <TableCell className="text-right">
                      {nodData.totalUpgradeCost.toLocaleString(
                        "sv-SE",
                      )}{" "}
                      kr
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
