import {
  Card,
  CardContent,
} from "@elevatorbud/ui/components/ui/card";
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
              {nodData.withPhone}
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
              {nodData.withoutPhone}
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
              {nodData.upgradeCost.toLocaleString("sv-SE")} kr
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
