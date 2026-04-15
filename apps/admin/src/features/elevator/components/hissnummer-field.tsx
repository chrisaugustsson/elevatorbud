import { useQuery } from "@tanstack/react-query";
import { checkElevatorNumber } from "~/server/elevator";
import { Label } from "@elevatorbud/ui/components/ui/label";
import { Input } from "@elevatorbud/ui/components/ui/input";
import { AlertCircle } from "lucide-react";
import { cn } from "@elevatorbud/ui/lib/utils";

export function HissnummerField({
  field,
  currentHissId,
  organizationId,
}: {
  field: {
    state: { value: string };
    handleChange: (value: string) => void;
  };
  currentHissId: string;
  organizationId: string;
}) {
  const elevatorNumber = field.state.value;
  const hasOrg = !!organizationId;
  const { data: checkResult } = useQuery({
    queryKey: [
      "elevator",
      "checkElevatorNumber",
      { elevatorNumber, organizationId, excludeId: currentHissId },
    ],
    queryFn: () =>
      checkElevatorNumber({
        data: {
          elevatorNumber: elevatorNumber!,
          organizationId: organizationId || undefined,
          excludeId: currentHissId,
        },
      }),
    enabled: !!elevatorNumber && hasOrg,
  });
  const isDuplicate = checkResult?.exists === true;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="elevator_number">
        Hissnummer <span className="text-destructive">*</span>
      </Label>
      <Input
        id="elevator_number"
        className={cn("h-11", isDuplicate && "border-destructive")}
        placeholder="Ange hissnummer..."
        value={elevatorNumber}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isDuplicate}
        aria-describedby={isDuplicate ? "elevator_number-error" : undefined}
      />
      {isDuplicate && (
        <p
          id="elevator_number-error"
          className="flex items-center gap-1 text-sm text-destructive"
        >
          <AlertCircle className="size-4" />
          Hissnumret finns redan i organisationen
        </p>
      )}
    </div>
  );
}
