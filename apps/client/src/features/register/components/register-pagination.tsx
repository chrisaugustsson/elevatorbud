import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface RegisterPaginationProps {
  totalCount: number;
  totalPages: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function RegisterPagination({
  totalCount,
  totalPages,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: RegisterPaginationProps) {
  if (totalCount <= 0) return null;

  const offset = page * limit;

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Visar {offset + 1}{"–"}{Math.min(offset + limit, totalCount)} av{" "}
        {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Select
          value={String(limit)}
          onValueChange={(v) => {
            onLimitChange(Number(v));
            onPageChange(0);
          }}
        >
          <SelectTrigger className="h-9 w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {page + 1} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-9"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
