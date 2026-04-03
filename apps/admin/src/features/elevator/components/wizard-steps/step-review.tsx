import type { HissForm } from "../../types";
import { AlertCircle, ClipboardList, Pencil } from "lucide-react";

type ReviewSection = {
  title: string;
  step: number;
  fields: Array<{
    label: string;
    value: string | boolean;
    type?: "text" | "boolean";
  }>;
};

interface StepReviewProps {
  form: HissForm;
  goToStep: (step: number) => void;
  orgs: Array<{ _id: string; name: string }> | undefined;
}

export function StepReview({ form, goToStep, orgs }: StepReviewProps) {
  const values = form.state.values;
  const orgName =
    orgs?.find((o) => o._id === values.organization_id)?.name ?? "";

  const sections: ReviewSection[] = [
    {
      title: "Identifiering",
      step: 1,
      fields: [
        { label: "Organisation", value: orgName },
        { label: "Hissnummer", value: values.elevator_number },
        { label: "Adress", value: values.address },
        { label: "Hissbeteckning", value: values.elevator_designation },
        { label: "Distrikt", value: values.district },
      ],
    },
    {
      title: "Teknisk specifikation",
      step: 2,
      fields: [
        { label: "Hisstyp", value: values.elevator_type },
        { label: "Fabrikat", value: values.manufacturer },
        { label: "Bygg\u00e5r", value: values.build_year },
        { label: "Hastighet", value: values.speed },
        { label: "Lyfth\u00f6jd", value: values.lift_height },
        { label: "Marklast", value: values.load_capacity },
        { label: "Antal plan", value: values.floor_count },
        { label: "Antal d\u00f6rrar", value: values.door_count },
      ],
    },
    {
      title: "D\u00f6rrar och korg",
      step: 3,
      fields: [
        { label: "Typ d\u00f6rrar", value: values.door_type },
        { label: "Genomg\u00e5ng", value: values.passthrough, type: "boolean" },
        { label: "Kollektiv", value: values.collective },
        { label: "Korgstorlek", value: values.cab_size },
        { label: "Dag\u00f6ppning", value: values.daylight_opening },
        { label: "B\u00e4rbeslag", value: values.grab_rail },
        { label: "D\u00f6rrmaskin", value: values.door_machine },
      ],
    },
    {
      title: "Maskineri",
      step: 4,
      fields: [
        { label: "Drivsystem", value: values.drive_system },
        { label: "Upph\u00e4ngning", value: values.suspension },
        { label: "Maskinplacering", value: values.machine_placement },
        { label: "Typ maskin", value: values.machine_type },
        { label: "Typ styrsystem", value: values.control_system_type },
      ],
    },
    {
      title: "Besiktning och underh\u00e5ll",
      step: 5,
      fields: [
        { label: "Besiktningsorgan", value: values.inspection_authority },
        { label: "Besiktningsm\u00e5nad", value: values.inspection_month },
        { label: "Sk\u00f6tself\u00f6retag", value: values.maintenance_company },
        { label: "Schaktbelysning", value: values.shaft_lighting },
      ],
    },
    {
      title: "Modernisering",
      step: 6,
      fields: [
        { label: "Moderniserings\u00e5r", value: values.modernization_year },
        { label: "Garanti", value: values.warranty, type: "boolean" },
        {
          label: "Rekommenderat moderniserings\u00e5r",
          value: values.recommended_modernization_year,
        },
        { label: "Budget belopp", value: values.budget_amount },
        {
          label: "\u00c5tg\u00e4rder vid modernisering",
          value: values.modernization_measures,
        },
      ],
    },
    {
      title: "N\u00f6dtelefon",
      step: 7,
      fields: [
        {
          label: "Har n\u00f6dtelefon",
          value: values.has_emergency_phone,
          type: "boolean",
        },
        { label: "Modell", value: values.emergency_phone_model },
        { label: "Typ", value: values.emergency_phone_type },
        {
          label: "Beh\u00f6ver uppgradering",
          value: values.needs_upgrade,
          type: "boolean",
        },
        { label: "Pris", value: values.emergency_phone_price },
      ],
    },
    {
      title: "Kommentarer",
      step: 8,
      fields: [{ label: "Kommentarer", value: values.comments }],
    },
  ];

  const hasRequiredFields =
    values.elevator_number.trim() !== "" && values.organization_id !== "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">Granska uppgifterna</h2>
      </div>

      {!hasRequiredFields && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Hissnummer och organisation m\u00e5ste anges innan du kan spara.
          </span>
        </div>
      )}

      {sections.map((section) => (
        <ReviewSectionCard
          key={section.step}
          section={section}
          goToStep={goToStep}
        />
      ))}
    </div>
  );
}

function ReviewSectionCard({
  section,
  goToStep,
}: {
  section: ReviewSection;
  goToStep: (step: number) => void;
}) {
  const hasAnyValue = section.fields.some((f) => {
    if (f.type === "boolean") return f.value === true;
    return typeof f.value === "string" && f.value.trim() !== "";
  });

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">
          {section.step}. {section.title}
        </h3>
        <button
          type="button"
          onClick={() => goToStep(section.step)}
          className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-4" />
        </button>
      </div>
      <div className="px-3 py-2">
        {!hasAnyValue ? (
          <p className="py-1 text-sm italic text-muted-foreground">
            Inga uppgifter ifyllda
          </p>
        ) : (
          <div className="space-y-1">
            {section.fields.map((field) => {
              const displayValue =
                field.type === "boolean"
                  ? field.value
                    ? "Ja"
                    : "Nej"
                  : (field.value as string);
              if (
                field.type !== "boolean" &&
                (!displayValue || displayValue.trim() === "")
              )
                return null;
              if (field.type === "boolean" && !field.value) return null;
              return (
                <div
                  key={field.label}
                  className="flex items-baseline justify-between gap-2 py-0.5 text-sm"
                >
                  <span className="text-muted-foreground">{field.label}</span>
                  <span className="text-right font-medium">
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
