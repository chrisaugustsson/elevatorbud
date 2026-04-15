import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { StatCard } from "@elevatorbud/ui/components/ui/stat-card";
import { Upload, CheckCircle2, XCircle } from "lucide-react";
import type { ImportResult } from "../hooks/use-import-machine";

export function ResultSection({
  result,
  onReset,
}: {
  result: ImportResult;
  onReset: () => void;
}) {
  const success = result.created > 0 || result.updated > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {success ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <CardTitle>
              {success ? "Import slutförd" : "Import misslyckades"}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Skapade"
              value={result.created}
              variant="success"
            />
            <StatCard
              label="Uppdaterade"
              value={result.updated}
              variant="warning"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={onReset}>
        <Upload className="mr-2 h-4 w-4" />
        Importera ny fil
      </Button>
    </div>
  );
}
