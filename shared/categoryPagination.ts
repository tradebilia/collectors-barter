export interface CategoryPaginationState {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  firstResultNumber: number;
  lastResultNumber: number;
}

export function getCategoryPaginationState(
  totalItems: number,
  requestedPage: number,
  itemsPerPage: number,
): CategoryPaginationState {
  const safeTotalItems = Math.max(0, Math.floor(totalItems));
  const safeItemsPerPage = Math.max(1, Math.floor(itemsPerPage));
  const totalPages = Math.max(1, Math.ceil(safeTotalItems / safeItemsPerPage));
  const currentPage = Math.min(Math.max(1, Math.floor(requestedPage)), totalPages);
  const startIndex = (currentPage - 1) * safeItemsPerPage;
  const endIndex = Math.min(startIndex + safeItemsPerPage, safeTotalItems);

  return {
    currentPage,
    totalPages,
    startIndex,
    endIndex,
    firstResultNumber: safeTotalItems === 0 ? 0 : startIndex + 1,
    lastResultNumber: endIndex,
  };
}
