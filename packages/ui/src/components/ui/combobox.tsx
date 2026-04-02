import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@elevatorbud/ui/lib/utils"

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  disabled?: boolean
  className?: string
}

function Combobox({
  value,
  onChange,
  suggestions,
  placeholder = "Skriv eller välj...",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const [highlightIndex, setHighlightIndex] = React.useState(-1)

  // Sync internal input value when external value changes
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  const filtered = React.useMemo(() => {
    if (!inputValue) return suggestions
    const lower = inputValue.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(lower))
  }, [suggestions, inputValue])

  // Reset highlight when filtered list changes
  React.useEffect(() => {
    setHighlightIndex(-1)
  }, [filtered.length])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setInputValue(next)
    onChange(next)
    if (!open) setOpen(true)
  }

  function handleSelect(suggestion: string) {
    setInputValue(suggestion)
    onChange(suggestion)
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true)
      e.preventDefault()
      return
    }

    if (!open) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0,
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1,
      )
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault()
      handleSelect(filtered[highlightIndex])
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-combobox-item]")
      items[highlightIndex]?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightIndex])

  const isExactMatch = suggestions.some(
    (s) => s.toLowerCase() === inputValue.toLowerCase(),
  )

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className={cn("relative", className)}>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-haspopup="listbox"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              setOpen(!open)
              inputRef.current?.focus()
            }}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground disabled:opacity-50"
            aria-label="Visa förslag"
          >
            <ChevronsUpDown className="size-4" />
          </button>
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "z-50 w-[var(--radix-popover-trigger-width)] origin-(--radix-popover-content-transform-origin) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          )}
        >
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto p-1"
          >
            {filtered.length === 0 && !inputValue && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Inga förslag tillgängliga
              </div>
            )}
            {filtered.length === 0 && inputValue && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Inga matchande förslag &mdash; värdet sparas som nytt
              </div>
            )}
            {filtered.map((suggestion, index) => (
              <div
                key={suggestion}
                data-combobox-item
                role="option"
                aria-selected={
                  suggestion.toLowerCase() === inputValue.toLowerCase()
                }
                className={cn(
                  "relative flex min-h-[44px] cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none",
                  highlightIndex === index && "bg-accent text-accent-foreground",
                  highlightIndex !== index && "hover:bg-accent/50",
                )}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleSelect(suggestion)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 size-4 shrink-0",
                    suggestion.toLowerCase() === inputValue.toLowerCase()
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
                {suggestion}
              </div>
            ))}
            {inputValue && !isExactMatch && filtered.length > 0 && (
              <>
                <div className="mx-2 my-1 border-t border-border" />
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Nytt värde: &quot;{inputValue}&quot;
                </div>
              </>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { Combobox }
export type { ComboboxProps }
