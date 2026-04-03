import type React from "react";

export function EditSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-4 px-3 py-3">{children}</div>
    </div>
  );
}
