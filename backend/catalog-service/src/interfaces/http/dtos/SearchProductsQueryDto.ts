import { SearchProductsQueryDto } from '../../../application/dtos/SearchProductsQueryDto';

export type SearchProductsQueryValidation =
  { valid: true; value: SearchProductsQueryDto } | { valid: false; error: string };

export function parseSearchProductsQuery(
  query: Record<string, unknown>,
  visibility: 'PUBLIC' | 'ADMIN' = 'PUBLIC',
): SearchProductsQueryValidation {
  if (query.q !== undefined && typeof query.q !== 'string') {
    return { valid: false, error: 'Query parameter "q" must be a string.' };
  }
  const keyword = typeof query.q === 'string' ? query.q.trim() : undefined;

  const categoryId = typeof query.categoryId === 'string' ? query.categoryId.trim() : undefined;
  const pageResult = parseInteger(query.page, 1, 'page');
  if (!pageResult.valid) return pageResult;

  if (
    query.pageSize !== undefined &&
    query.limit !== undefined &&
    String(query.pageSize) !== String(query.limit)
  ) {
    return {
      valid: false,
      error: 'Use either "pageSize" or "limit", not both with different values.',
    };
  }
  const limitResult = parseInteger(query.pageSize ?? query.limit, 20, 'pageSize');
  if (!limitResult.valid) return limitResult;
  if (limitResult.value > 100) {
    return { valid: false, error: 'Query parameter "pageSize" must not exceed 100.' };
  }

  const minPriceResult = parseOptionalPrice(query.minPrice, 'minPrice');
  if (!minPriceResult.valid) return minPriceResult;

  const maxPriceResult = parseOptionalPrice(query.maxPrice, 'maxPrice');
  if (!maxPriceResult.valid) return maxPriceResult;

  if (
    minPriceResult.value !== undefined &&
    maxPriceResult.value !== undefined &&
    minPriceResult.value > maxPriceResult.value
  ) {
    return { valid: false, error: 'Query parameter "minPrice" must not exceed "maxPrice".' };
  }

  const condition = parseEnum(
    query.condition,
    ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'],
    'condition',
  );
  if (!condition.valid) return condition;

  const sort = parseEnum(query.sort, ['featured', 'newest', 'price-asc', 'price-desc'], 'sort');
  if (!sort.valid) return sort;

  const status = parseEnum(
    query.status,
    ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'OUT_OF_STOCK'],
    'status',
  );
  if (!status.valid) return status;
  if (visibility !== 'ADMIN' && status.value !== undefined) {
    return { valid: false, error: 'Query parameter "status" is only available to Admin.' };
  }

  return {
    valid: true,
    value: {
      ...(keyword ? { q: keyword } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(minPriceResult.value !== undefined ? { minPrice: minPriceResult.value } : {}),
      ...(maxPriceResult.value !== undefined ? { maxPrice: maxPriceResult.value } : {}),
      ...(condition.value ? { condition: condition.value } : {}),
      ...(status.value ? { status: status.value } : {}),
      ...(sort.value ? { sort: sort.value } : {}),
      visibility,
      page: pageResult.value,
      limit: limitResult.value,
    },
  };
}

type IntegerValidation = { valid: true; value: number } | { valid: false; error: string };
type OptionalNumberValidation = { valid: true; value?: number } | { valid: false; error: string };
type OptionalValueValidation<T extends string> =
  | { valid: true; value?: T }
  | { valid: false; error: string };

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  name: string,
): OptionalValueValidation<T> {
  if (value === undefined) return { valid: true };
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `Query parameter "${name}" must be one of: ${allowed.join(', ')}.`,
    };
  }
  const matched = allowed.find((item) => item === value);
  if (matched === undefined) {
    return {
      valid: false,
      error: `Query parameter "${name}" must be one of: ${allowed.join(', ')}.`,
    };
  }
  return { valid: true, value: matched };
}

function parseInteger(value: unknown, fallback: number, name: string): IntegerValidation {
  if (value === undefined) return { valid: true, value: fallback };
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return { valid: false, error: `Query parameter "${name}" must be a positive integer.` };
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { valid: false, error: `Query parameter "${name}" must be a positive integer.` };
  }
  return { valid: true, value: parsed };
}

function parseOptionalPrice(value: unknown, name: string): OptionalNumberValidation {
  if (value === undefined) return { valid: true };
  if (typeof value !== 'string' || value.trim() === '') {
    return { valid: false, error: `Query parameter "${name}" must be a non-negative number.` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { valid: false, error: `Query parameter "${name}" must be a non-negative number.` };
  }
  return { valid: true, value: parsed };
}
