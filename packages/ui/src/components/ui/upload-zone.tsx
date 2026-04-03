import * as React from "react"
import { Upload, XCircle } from "lucide-react"
import { Card, CardContent } from "@elevatorbud/ui/components/ui/card"
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center transition-colors hover:border-muted-foreground/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-4 text-sm font-medium">{title}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileSelect(file)
            }}
          />
        </div>
        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {children && <div className="mt-6">{children}</div>}
      </CardContent>
    </Card>
  )
}

export { UploadZone }
