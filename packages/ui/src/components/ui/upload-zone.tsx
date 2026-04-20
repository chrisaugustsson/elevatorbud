import * as React from "react"
import { Upload, XCircle } from "lucide-react"
import { Card, CardContent } from "@elevatorbud/ui/components/ui/card"
import { Button } from "@elevatorbud/ui/components/ui/button"
import { cn } from "@elevatorbud/ui/lib/utils"

function UploadZone({
  onFileSelect,
  accept,
  acceptedExtensions,
  maxSizeMB,
  title = "Drop files here",
  subtitle,
  error,
  children,
  className,
}: {
  onFileSelect: (file: File) => void
  accept?: string
  /**
   * Defence-in-depth: the `accept` attribute only filters the file picker,
   * not drag-drop. When provided, files whose name ends in an extension
   * outside this list are rejected regardless of how they were selected.
   * Pass extensions lowercased and with leading dot (e.g. `[".xlsx"]`).
   */
  acceptedExtensions?: string[]
  /**
   * When provided, files larger than this limit are rejected up-front.
   * FR-25 / US-019: the error message states cause AND recovery.
   */
  maxSizeMB?: number
  title?: string
  subtitle?: string
  error?: string | null
  children?: React.ReactNode
  className?: string
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [builtInError, setBuiltInError] = React.useState<string | null>(null)

  const validateAndSelect = (file: File) => {
    if (acceptedExtensions && acceptedExtensions.length > 0) {
      const name = file.name.toLowerCase()
      const ok = acceptedExtensions.some((ext) => name.endsWith(ext.toLowerCase()))
      if (!ok) {
        setBuiltInError(
          `Filen "${file.name}" har fel format. Accepterade format: ${acceptedExtensions.join(", ")} — välj en fil i rätt format och försök igen.`,
        )
        return
      }
    }
    if (maxSizeMB !== undefined && file.size > maxSizeMB * 1024 * 1024) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
      setBuiltInError(
        `Filen är för stor (${fileSizeMB} MB). Maximal filstorlek är ${maxSizeMB} MB — minska filstorleken eller dela upp i flera filer och försök igen.`,
      )
      return
    }
    setBuiltInError(null)
    onFileSelect(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  // Consumer-provided `error` takes precedence over the zone's built-in
  // message, since the consumer may have its own validation (e.g. workbook
  // parse errors) to surface.
  const displayError = error ?? builtInError

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {/*
          The visible "Välj fil" button is the accessible affordance —
          keyboard users tab to it and press Enter/Space. We ALSO let a
          mouse click anywhere on the dashed body open the picker, because
          a large drop target that silently swallows clicks surprises
          users. Keyboard focus is still owned exclusively by the button
          (no duplicate tab stop), and the click handler short-circuits
          if the real button was the target so we don't open the picker
          twice.
        */}
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={(e) => {
            // Let the button handle its own click — avoid opening the
            // picker twice when the real affordance was used.
            if ((e.target as HTMLElement).closest("button")) return
            fileInputRef.current?.click()
          }}
        >
          <Upload
            aria-hidden="true"
            className={cn(
              "mx-auto h-10 w-10 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground/50",
            )}
          />
          <p className="mt-4 text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            aria-label={title}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            Välj fil
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) validateAndSelect(file)
              if (e.target) e.target.value = ""
            }}
          />
        </div>
        {displayError && (
          <div
            className="mt-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </CardContent>
    </Card>
  )
}

export { UploadZone }
