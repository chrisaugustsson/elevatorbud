import {
  Card,
  CardContent,
} from "@elevatorbud/ui/components/ui/card";
import { Badge } from "@elevatorbud/ui/components/ui/badge";

export function SheetCard({
  title,
  found,
  count,
  required,
  extra,
}: {
  title: string;
  found: boolean;
  count: number;
  required?: boolean;
  extra?: string;
}) {
  return (
    <Card>
      <CardContent className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          {found ? (
            <Badge variant="secondary">{count} rader</Badge>
          ) : required ? (
            <Badge variant="destructive">Saknas</Badge>
          ) : (
            <Badge variant="outline">Ej inkluderat</Badge>
          )}
        </div>
        {extra && (
          <p className="mt-1 text-xs text-muted-foreground">{extra}</p>
        )}
      </CardContent>
    </Card>
  );
}
