import type { PaginatedResponse } from '@/lib/api';

export function paginated<T>(items: T[]): PaginatedResponse<T> {
  return {
    items,
    pagination: { page: 1, pageSize: 10, total: items.length, totalPages: 1 },
  };
}
