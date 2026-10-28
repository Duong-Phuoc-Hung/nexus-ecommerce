import { SearchProductsQueryDto } from '../../../application/dtos/SearchProductsQueryDto';

export type SearchProductsQueryValidation =
  { valid: true; value: SearchProductsQueryDto } | { valid: false; error: string };

export function parseSearchProductsQuery(
  query: Record<string, unknown>,
): SearchProductsQueryValidation {
  const keyword = typeof query.q === 'string' ? query.q.trim() : '';
  if (!keyword) {
    return { valid: false, error: 'Query parameter "q" is required.' };
  }

  const categoryId = typeof query.categoryId === 'string' ? query.categoryId.trim() : undefined;
  const pageResult = parseInteger(query.page, 1, 'page');
  if (!pageResult.valid) return pageResult;

  const limitResult = parseInteger(query.limit, 20, 'limit');
  if (!limitResult.valid) return limitResult;
  if (limitResult.value > 100) {
    return { valid: false, error: 'Query parameter "limit" must not exceed 100.' };
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

  return {
    valid: true,
    value: {
      q: keyword,
      ...(categoryId ? { categoryId } : {}),
      ...(minPriceResult.value !== undefined ? { minPrice: minPriceResult.value } : {}),
      ...(maxPriceResult.value !== undefined ? { maxPrice: maxPriceResult.value } : {}),
      page: pageResult.value,
      limit: limitResult.value,
    },
  };
}

type IntegerValidation = { valid: true; value: number } | { valid: false; error: string };
type OptionalNumberValidation = { valid: true; value?: number } | { valid: false; error: string };

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
