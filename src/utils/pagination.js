/**
 * Helper to normalize pagination parameters and format pagination metadata.
 */
export const getPagination = (query = {}, defaultLimit = 15) => {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query?.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const formatPaginationMeta = (total, page, limit, extra = {}) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total_items: total,
    total_page: totalPages,
    current_page: page,
    item_per_page: limit,
    has_more: page < totalPages,
    ...extra,
  };
};
