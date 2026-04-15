import * as React from "react"
import { Upload, XCircle } from "lucide-react"
import { Card, CardContent } from "@elevatorbud/ui/components/ui/card"
import { Button } from "@elevatorbud/ui/components/ui/button"
import { cn } from "@elevatorbud/ui/lib/utils"

function UploadZone({
  onFileSelect,
  accept,
  title = "Drop files here",
  subtitle,
  error,
  children,
  className,
}: {
  onFileSelect: (file: File) => void
  accept?: string
  title?: string
  subtitle?: string
  error?: string | null
  children?: React.ReactNode
  className?: string
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
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
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={cn(
            "mx-auto h-10 w-10 transition-colors",
            isDragOver ? "text-primary" : "text-muted-foreground/50",
          )} />
          <p className="mt-4 text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
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
              if (file) onFileSelect(file)
              if (e.target) e.target.value = ""
            }}
          />
        </div>
        {error && (
          <div
            className="mt-4 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            role="alert"
            aria-live="assertive"
          >
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </CardContent>
    </Card>
  )
}

export { UploadZone }
