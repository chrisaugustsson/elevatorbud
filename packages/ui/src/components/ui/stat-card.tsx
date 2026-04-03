import * as React from "react"
import { cn } from "@elevatorbud/ui/lib/utils"

function StatCard({
  label,
  value,
  variant = "default",
  className,
}: {
  label: string
  value: number | string
  variant?: "success" | "warning" | "info" | "default"
  className?: string
}) {
  const colors = {
    success: "text-green-700 dark:text-green-400",
    warning: "text-amber-700 dark:text-amber-400",
    info: "text-blue-700 dark:text-blue-400",
    default: "text-foreground",
  }

  return (
    <div className={cn("rounded-md border p-3", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold", colors[variant])}>{value}</p>
    </div>
  )
}

export { StatCard }
