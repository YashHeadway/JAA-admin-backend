export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

/**
 * Helper to normalize pagination parameters and format pagination metadata.
 * Validates page and limit as positive integers, defaults to page=1 and limit=20,
 * and enforces a maximum page size of 100.
 *
 * @param {object} query - Express req.query object containing page, limit
 * @param {number} defaultLimit - Fallback limit (defaults to 20)
 * @param {number} maxLimit - Upper limit threshold (defaults to 100)
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const getPagination = (query = {}, defaultLimit = DEFAULT_PAGE_LIMIT, maxLimit = MAX_PAGE_LIMIT) => {
  const rawPage = parseInt(query?.page, 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const rawLimit = parseInt(query?.limit, 10);
  const requestedLimit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : (defaultLimit || DEFAULT_PAGE_LIMIT);
  const limit = Math.max(1, Math.min(maxLimit, requestedLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Formats standardized pagination metadata.
 * Only returns: total_items, total_page, current_page, item_per_page, has_more
 */
export const formatPaginationMeta = (total, page, limit, extra = {}) => {
  const safeTotal = Math.max(0, parseInt(total, 10) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    total_items: safeTotal,
    total_page: totalPages,
    current_page: page,
    item_per_page: limit,
    has_more: page < totalPages,
    ...extra,
  };
};
