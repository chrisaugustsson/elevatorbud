import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@elevatorbud/ui/components/ui/button"
import { cn } from "@elevatorbud/ui/lib/utils"

function SortHeader({
  label,
  sortDirection,
  onSort,
  className,
}: {
  label: string
  sortDirection?: "asc" | "desc" | null
  onSort: () => void
  className?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3", className)}
      onClick={onSort}
    >
      {label}
      {sortDirection === "desc" ? (
        <ArrowDown className="ml-1 size-3" />
      ) : sortDirection === "asc" ? (
        <ArrowUp className="ml-1 size-3" />
      ) : (
        <ArrowUpDown className="ml-1 size-3" />
      )}
    </Button>
  )
}

export { SortHeader }
