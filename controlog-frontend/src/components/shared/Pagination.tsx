import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PaginationMeta } from '@/lib/api';

interface Props {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export default function Pagination({ pagination, onPageChange }: Props) {
  const { page, totalPages, total } = pagination;

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between pt-1">
      <p className="text-xs text-gray-600">
        Página {page} de {totalPages} · {total} registros no total
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Próxima página"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
