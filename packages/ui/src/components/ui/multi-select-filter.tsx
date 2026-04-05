import * as React from "react"
import { Button } from "@elevatorbud/ui/components/ui/button"
import { Badge } from "@elevatorbud/ui/components/ui/badge"
import { Checkbox } from "@elevatorbud/ui/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover"

function MultiSelectFilter({
  title,
  options,
  selected,
  onSelectedChange,
  emptyText = "No options",
  clearText = "Clear",
}: {
  title: string
  options: string[]
  selected: string[]
  onSelectedChange: (selected: string[]) => void
  emptyText?: string
  clearText?: string
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {title}
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 rounded-sm px-1 text-xs"
            >
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectedChange([...selected, opt])
                  } else {
                    onSelectedChange(selected.filter((s) => s !== opt))
                  }
                }}
              />
              {opt}
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {emptyText}
            </p>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => onSelectedChange([])}
          >
            {clearText}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { MultiSelectFilter }
