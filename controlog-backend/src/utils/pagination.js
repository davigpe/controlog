export function paginationArgs({ page, pageSize }) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginationMeta({ page, pageSize, total }) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
