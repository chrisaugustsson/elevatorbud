import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@elevatorbud/ui/components/ui/card";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import { Wrench } from "lucide-react";

type MeasuresCardProps = {
  measures: { measure: string; count: number }[];
};

export function MeasuresCard({ measures }: MeasuresCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wrench className="h-4 w-4" />
          Vanligaste \u00e5tg\u00e4rder
        </CardTitle>
      </CardHeader>
      <CardContent>
        {measures.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Inga \u00e5tg\u00e4rder registrerade.
          </p>
        ) : (
          <div className="space-y-3">
            {measures.map((a) => (
              <div
                key={a.measure}
                className="flex items-center justify-between"
              >
                <span className="truncate text-sm">{a.measure}</span>
                <Badge variant="secondary" className="ml-2 shrink-0">
                  {a.count}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
