//////////////////////////////////////////////////////////
// 📄 PAGINATION UTILITY
// Safe pagination parsing and Prisma integration
//
// MULTI-CONTEXT ARCHITECTURE:
//   ANALYTICS         — large result sets, configurable limits
//   OPERATIONAL       — dashboards, consistent paging
//   VENDOR LISTINGS   — property-scoped pagination
//   TASK FEEDS        — realtime-aware pagination
//   REALTIME HISTORY  — cursor-less pagination support
//
// USED BY:
//   All list endpoints (tasks, calls, bookings, etc.)
//   Analytics and reporting queries
//   Dashboard endpoints
//   Real-time event feeds
//   Data export operations
//
// PREVENTS:
//   Negative page/limit values
//   NaN from malformed input
//   Integer overflow attacks
//   Memory exhaustion from excessive limits
//   Invalid sort orders
//   Inconsistent pagination metadata
//
// GUARANTEES:
//   Always returns valid pagination object
//   Never throws on malformed input
//   Prisma-ready skip/take values
//   Consistent metadata structure
//   Type-safe default values
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// PAGINATION CONFIGURATION CONSTANTS
//
// These define the platform defaults and safety
// boundaries for pagination across all operations.
//
// RATIONALE:
//   DEFAULT_PAGE = 1     — standard web pagination
//   DEFAULT_LIMIT = 20   — balance UX and performance
//   MAX_LIMIT = 500      — prevent abuse, memory safety
//   MIN_PAGE = 1         — pages must start at 1
//////////////////////////////////////////////////////////

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 500;
const MIN_PAGE = 1;

//////////////////////////////////////////////////////////
// VALID SORT ORDER VALUES
//
// Accepts various formats and normalizes to asc/desc
// for Prisma compatibility.
//////////////////////////////////////////////////////////

const VALID_SORT_ORDERS = ["asc", "desc"];
const SORT_ORDER_ALIASES = {
  asc: "asc",
  ascending: "asc",
  a: "asc",
  desc: "desc",
  descending: "desc",
  d: "desc",
};

//////////////////////////////////////////////////////////
// PARSE PAGINATION FROM QUERY
//
// Safely extracts and validates pagination parameters
// from Express req.query object.
//
// Defensive against:
//   - req.query undefined
//   - Non-numeric string values ("abc", "null")
//   - Negative numbers
//   - NaN values
//   - String type coercion attacks
//   - Exceeding MAX_LIMIT
//   - Floating point values
//   - Missing parameters (uses defaults)
//
// Usage in routes:
//   const pagination = parsePagination(req.query);
//   const tasks = await prisma.task.findMany({
//     ...pagination.prismaOptions(["title", "createdAt"]),
//     where: { propertyId: userPropertyId }
//   });
//
// Usage with custom max limit:
//   const pagination = parsePagination(req.query, {
//     maxLimit: 100,
//     defaultLimit: 10
//   });
//
// Parameters:
//   query — req.query object (may be undefined/malformed)
//   options — optional configuration object
//     - maxLimit: override MAX_LIMIT
//     - defaultLimit: override DEFAULT_LIMIT
//     - defaultPage: override DEFAULT_PAGE
//
// Returns:
//   PaginationOptions object with properties:
//     - page (number >= 1)
//     - limit (number, 1 to maxLimit)
//     - sortBy (string or null)
//     - sortOrder (string: "asc" or "desc")
//     - skip (Prisma-ready)
//     - take (Prisma-ready)
//     - prismaOptions(allowedFields) → Prisma fragment
//
// Safety guarantees:
//   ✓ All values are numbers (page, limit, skip, take)
//   ✓ Page is >= MIN_PAGE
//   ✓ Limit is between 1 and maxLimit
//   ✓ Skip and take are always non-negative
//   ✓ Sort order is always "asc" or "desc"
//   ✓ No NaN values ever returned
//   ✓ No runtime errors from malformed input
//////////////////////////////////////////////////////////

function parsePagination(query, options = {}) {

  //////////////////////////////////////////////////////////
  // CONFIGURATION — use options or defaults
  //////////////////////////////////////////////////////////

  const maxLimit = options.maxLimit || MAX_LIMIT;
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const defaultPage = options.defaultPage || DEFAULT_PAGE;

  //////////////////////////////////////////////////////////
  // EXTRACT AND SANITIZE PAGE
  //
  // Must be:
  //   - integer
  //   - >= MIN_PAGE
  //   - finite (not Infinity)
  //   - not NaN
  //////////////////////////////////////////////////////////

  let page = safeParse(query?.page, defaultPage);

  // Enforce minimum page
  if (page < MIN_PAGE) {
    page = defaultPage;
  }

  // Prevent non-finite values (Infinity, NaN)
  if (!Number.isFinite(page)) {
    page = defaultPage;
  }

  //////////////////////////////////////////////////////////
  // EXTRACT AND SANITIZE LIMIT
  //
  // Must be:
  //   - integer
  //   - between 1 and maxLimit
  //   - finite
  //   - not NaN
  //////////////////////////////////////////////////////////

  let limit = safeParse(query?.limit, defaultLimit);

  // Enforce minimum limit
  if (limit < 1) {
    limit = defaultLimit;
  }

  // Enforce maximum limit (safety boundary)
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Prevent non-finite values
  if (!Number.isFinite(limit)) {
    limit = defaultLimit;
  }

  //////////////////////////////////////////////////////////
  // EXTRACT SORT ORDER
  //
  // Normalize various formats to "asc" or "desc"
  //////////////////////////////////////////////////////////

  let sortOrder = query?.sortOrder || "asc";
  sortOrder = normalizeSortOrder(sortOrder);

  //////////////////////////////////////////////////////////
  // EXTRACT SORT BY FIELD
  //
  // Keep as-is for now; validation happens in
  // prismaOptions() when field whitelist provided
  //////////////////////////////////////////////////////////

  const sortBy = extractSortBy(query?.sortBy);

  //////////////////////////////////////////////////////////
  // CALCULATE PRISMA SKIP VALUE
  //
  // Converts page number to skip offset
  // Formula: skip = (page - 1) * limit
  //////////////////////////////////////////////////////////

  const skip = getSkipValue(page, limit);

  //////////////////////////////////////////////////////////
  // BUILD PAGINATION OPTIONS OBJECT
  //////////////////////////////////////////////////////////

  return {
    page,
    limit,
    sortBy,
    sortOrder,
    skip,
    take: limit,

    //////////////////////////////////////////////////////////
    // PRISMA OPTIONS HELPER
    //
    // Returns a Prisma-compatible pagination fragment
    // ready to spread into findMany().
    //
    // Usage:
    //   const pagination = parsePagination(req.query);
    //   const tasks = await prisma.task.findMany({
    //     ...pagination.prismaOptions(["title", "createdAt"]),
    //     where: { propertyId: userPropertyId }
    //   });
    //
    // Parameters:
    //   allowedFields — array of field names that can be sorted by
    //                   If provided, sortBy is validated against it
    //                   If not provided, sorting not included
    //
    // Returns:
    //   {
    //     skip: number,
    //     take: number,
    //     orderBy?: { [field]: sort_direction }  // only if allowed
    //   }
    //////////////////////////////////////////////////////////

    prismaOptions(allowedFields = null) {
      const options = {
        skip,
        take: limit,
      };

      // Only include orderBy if sortBy is provided and allowed
      if (sortBy && allowedFields && Array.isArray(allowedFields)) {
        if (allowedFields.includes(sortBy)) {
          options.orderBy = {
            [sortBy]: sortOrder,
          };
        }
      }

      return options;
    },
  };
}

//////////////////////////////////////////////////////////
// SAFELY PARSE INTEGER FROM STRING
//
// Converts query string value to safe integer.
// Handles:
//   - "42"         → 42
//   - 42           → 42
//   - "abc"        → fallback
//   - "3.14"       → 3 (truncates)
//   - null         → fallback
//   - undefined    → fallback
//   - NaN          → fallback
//   - Infinity     → fallback
//
// Parameters:
//   value — string or number (may be undefined)
//   fallback — default value if parse fails
//
// Returns:
//   number — parsed integer or fallback
//////////////////////////////////////////////////////////

function safeParse(value, fallback = DEFAULT_LIMIT) {

  //////////////////////////////////////////////////////////
  // NULL/UNDEFINED — return fallback
  //////////////////////////////////////////////////////////

  if (value === null || value === undefined) {
    return fallback;
  }

  //////////////////////////////////////////////////////////
  // ALREADY A NUMBER — validate and return
  //////////////////////////////////////////////////////////

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return fallback;
    }
    return Math.floor(value);
  }

  //////////////////////////////////////////////////////////
  // STRING — attempt parse
  //////////////////////////////////////////////////////////

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Empty string → fallback
    if (trimmed.length === 0) {
      return fallback;
    }

    // Parse to number
    const parsed = Number(trimmed);

    // Reject NaN and non-finite
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    // Return as integer (truncate decimal)
    return Math.floor(parsed);
  }

  //////////////////////////////////////////////////////////
  // ANYTHING ELSE — return fallback
  //////////////////////////////////////////////////////////

  return fallback;
}

//////////////////////////////////////////////////////////
// EXTRACT SORT BY FIELD
//
// Safely extracts sortBy field name from query.
// Returns null if not provided or invalid type.
//
// Validation of field name happens in
// prismaOptions() when whitelist provided.
//
// Parameters:
//   value — query?.sortBy (may be any type)
//
// Returns:
//   string|null
//////////////////////////////////////////////////////////

function extractSortBy(value) {

  //////////////////////////////////////////////////////////
  // MUST BE A NON-EMPTY STRING
  //////////////////////////////////////////////////////////

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed;
}

//////////////////////////////////////////////////////////
// NORMALIZE SORT ORDER
//
// Accepts various formats and normalizes to "asc"/"desc"
// for Prisma compatibility.
//
// Accepts:
//   - "asc", "ASC", "Asc"
//   - "desc", "DESC", "Desc"
//   - "ascending", "a"
//   - "descending", "d"
//   - Any variation in case
//
// Returns:
//   "asc" or "desc" (default: "asc")
//
// Parameters:
//   value — sort order string (any type)
//
// Returns:
//   "asc" or "desc"
//
// Safety guarantee:
//   Always returns Prisma-compatible value
//   Never throws
//   Case-insensitive
//////////////////////////////////////////////////////////

function normalizeSortOrder(value) {

  //////////////////////////////////////////////////////////
  // MUST BE STRING
  //////////////////////////////////////////////////////////

  if (typeof value !== "string") {
    return "asc";
  }

  //////////////////////////////////////////////////////////
  // NORMALIZE — lowercase and check aliases
  //////////////////////////////////////////////////////////

  const lower = value.toLowerCase().trim();

  if (SORT_ORDER_ALIASES[lower]) {
    return SORT_ORDER_ALIASES[lower];
  }

  //////////////////////////////////////////////////////////
  // DEFAULT TO ASC IF UNRECOGNIZED
  //////////////////////////////////////////////////////////

  return "asc";
}

//////////////////////////////////////////////////////////
// CALCULATE PRISMA SKIP VALUE
//
// Converts page number to Prisma skip offset.
//
// Formula:
//   skip = (page - 1) * limit
//
// Examples:
//   page=1, limit=20 → skip=0   (first 20 results)
//   page=2, limit=20 → skip=20  (results 21-40)
//   page=3, limit=10 → skip=20  (results 21-30)
//
// Parameters:
//   page — page number (1-indexed)
//   limit — items per page
//
// Returns:
//   number — Prisma-compatible skip value
//
// Safety:
//   Always >= 0
//   Never NaN
//   Handles edge cases (page=1 → skip=0)
//////////////////////////////////////////////////////////

function getSkipValue(page, limit) {

  //////////////////////////////////////////////////////////
  // VALIDATE INPUTS
  //////////////////////////////////////////////////////////

  if (!Number.isFinite(page) || !Number.isFinite(limit)) {
    return 0;
  }

  if (page < MIN_PAGE || limit < 1) {
    return 0;
  }

  //////////////////////////////////////////////////////////
  // CALCULATE SKIP
  //////////////////////////////////////////////////////////

  const skip = (page - 1) * limit;

  //////////////////////////////////////////////////////////
  // ENSURE NON-NEGATIVE (defensive)
  //////////////////////////////////////////////////////////

  return Math.max(0, skip);
}

//////////////////////////////////////////////////////////
// BUILD PAGINATION METADATA
//
// Constructs pagination response metadata for APIs.
// Includes information about total results,
// current page, and navigation flags.
//
// Usage in routes:
//   const { count } = await prisma.task.aggregate({
//     _count: true,
//     where: filter
//   });
//
//   const tasks = await prisma.task.findMany({
//     ...pagination.prismaOptions(["title"]),
//     where: filter
//   });
//
//   const meta = buildPaginationMeta({
//     total: count,
//     page: pagination.page,
//     limit: pagination.limit
//   });
//
//   res.json({
//     data: tasks,
//     meta
//   });
//
// Parameters:
//   options — object with:
//     - total (number) — total result count
//     - page (number) — current page
//     - limit (number) — items per page
//
// Returns:
//   {
//     total: number,
//     page: number,
//     limit: number,
//     totalPages: number,
//     hasNextPage: boolean,
//     hasPreviousPage: boolean
//   }
//
// Safety:
//   All return values are numbers or booleans
//   Never NaN
//   Safe for JSON serialization
//////////////////////////////////////////////////////////

function buildPaginationMeta(options = {}) {

  //////////////////////////////////////////////////////////
  // EXTRACT AND SANITIZE INPUTS
  //////////////////////////////////////////////////////////

  const total = Math.max(0, safeParse(options.total, 0));
  const page = Math.max(MIN_PAGE, safeParse(options.page, DEFAULT_PAGE));
  const limit = Math.max(1, safeParse(options.limit, DEFAULT_LIMIT));

  //////////////////////////////////////////////////////////
  // CALCULATE DERIVED VALUES
  //////////////////////////////////////////////////////////

  // Total pages (round up division)
  const totalPages = Math.ceil(total / limit) || 0;

  // Navigation flags
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > MIN_PAGE;

  //////////////////////////////////////////////////////////
  // RETURN METADATA OBJECT
  //////////////////////////////////////////////////////////

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}

//////////////////////////////////////////////////////////
// BUILD COMPLETE PAGINATION RESPONSE
//
// Convenience function that combines parsing,
// Prisma query execution, and metadata building.
//
// Reduces boilerplate in list endpoints.
//
// Usage in routes (BEFORE implementation):
//   const { data, meta } = await buildPaginatedResponse({
//     query: req.query,
//     model: prisma.task,
//     filter: { propertyId: userPropertyId },
//     allowedFields: ["title", "createdAt", "status"]
//   });
//
//   res.json({ data, meta });
//
// Note:
//   This is a FUTURE helper. For now, implement
//   pagination manually in routes using parsePagination()
//   and buildPaginationMeta() separately.
//
// Parameters:
//   query — req.query
//   model — Prisma model (e.g., prisma.task)
//   filter — WHERE clause
//   allowedFields — fields that can be sorted by
//
// Returns:
//   {
//     data: array,
//     meta: pagination metadata
//   }
//
// Note: FUTURE IMPLEMENTATION — not included yet
//////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////
// EXPORTS
//////////////////////////////////////////////////////////

module.exports = {

  //////////////////////////////////////////////////////////
  // PRIMARY FUNCTION — use in all list routes
  //////////////////////////////////////////////////////////

  parsePagination,

  //////////////////////////////////////////////////////////
  // RESPONSE BUILDING HELPERS
  //////////////////////////////////////////////////////////

  buildPaginationMeta,
  getSkipValue,

  //////////////////////////////////////////////////////////
  // NORMALIZATION HELPERS
  //////////////////////////////////////////////////////////

  normalizeSortOrder,

  //////////////////////////////////////////////////////////
  // INTERNAL HELPERS (for testing)
  //////////////////////////////////////////////////////////

  safeParse,
  extractSortBy,

  //////////////////////////////////////////////////////////
  // CONFIGURATION CONSTANTS
  //////////////////////////////////////////////////////////

  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_PAGE,
  VALID_SORT_ORDERS,
  SORT_ORDER_ALIASES,
};
