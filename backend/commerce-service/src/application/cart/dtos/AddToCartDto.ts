export class CartValidationError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'CartValidationError';
  }
}

export interface AddToCartInputDto {
  productId: string;
  quantity: number;
}

export interface MergeCartItemInputDto {
  productId: string;
  quantity: number;
}

export interface MergeCartInputDto {
  items: MergeCartItemInputDto[];
}

export interface UpdateCartItemInputDto {
  quantity: number;
}

export interface CartItemDto {
  id: string;
  productId: string;
  title: string;
  sellerId: string;
  price: number;
  stockQuantity: number;
  status: string;
  quantity: number;
  subtotal: number;
  imageUrl: string | null;
  availability?: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';
}

export interface CartDto {
  id: string;
  userId: string;
  expiresAt: string;
  totalItems: number;
  subtotal: number;
  currency: string;
  items: CartItemDto[];
}

const PRODUCT_ID_PATTERN =
  /^([0-9]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

export function validateAddToCartInput(body: unknown): AddToCartInputDto {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new CartValidationError(400, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ.');
  }

  const record = body as Record<string, unknown>;
  const rawProductId = record.productId !== undefined ? String(record.productId).trim() : '';
  const rawQuantity = record.quantity !== undefined ? Number(record.quantity) : 1;

  const fieldErrors: Record<string, string> = {};

  if (!rawProductId || !PRODUCT_ID_PATTERN.test(rawProductId)) {
    fieldErrors.productId = 'Mã sản phẩm (productId) phải là chuỗi số hoặc UUID hợp lệ.';
  }

  if (!Number.isInteger(rawQuantity) || rawQuantity < 1) {
    fieldErrors.quantity = 'Số lượng sản phẩm (quantity) phải là số nguyên >= 1.';
  } else if (rawQuantity > 999) {
    fieldErrors.quantity = 'Số lượng sản phẩm tối đa cho mỗi lần thêm là 999.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new CartValidationError(
      400,
      'VALIDATION_ERROR',
      'Dữ liệu thêm vào giỏ hàng không hợp lệ.',
      fieldErrors,
    );
  }

  return {
    productId: rawProductId,
    quantity: rawQuantity,
  };
}

export function validateUpdateCartItemInput(body: unknown): UpdateCartItemInputDto {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new CartValidationError(400, 'VALIDATION_ERROR', 'Dữ liệu yêu cầu không hợp lệ.');
  }

  const record = body as Record<string, unknown>;
  const rawQuantity = record.quantity !== undefined ? Number(record.quantity) : NaN;

  if (isNaN(rawQuantity) || !Number.isInteger(rawQuantity)) {
    throw new CartValidationError(
      400,
      'VALIDATION_ERROR',
      'Số lượng sản phẩm cập nhật phải là số nguyên.',
      { quantity: 'quantity phải là số nguyên (truyền 0 để xóa món hàng).' },
    );
  }

  return {
    quantity: rawQuantity,
  };
}

export function validateMergeCartInput(body: unknown): MergeCartInputDto {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new CartValidationError(400, 'VALIDATION_ERROR', 'Dữ liệu gộp giỏ hàng không hợp lệ.');
  }

  const record = body as Record<string, unknown>;
  const rawItems = record.items;

  if (!Array.isArray(rawItems)) {
    throw new CartValidationError(
      400,
      'VALIDATION_ERROR',
      'Danh sách món hàng (items) phải là một mảng.',
    );
  }

  const validatedItems: MergeCartItemInputDto[] = [];
  const fieldErrors: Record<string, string> = {};

  rawItems.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      fieldErrors[`items[${index}]`] = 'Item không hợp lệ.';
      return;
    }

    const itemRecord = entry as Record<string, unknown>;
    const rawProductId =
      itemRecord.productId !== undefined ? String(itemRecord.productId).trim() : '';
    const rawQuantity = itemRecord.quantity !== undefined ? Number(itemRecord.quantity) : 1;

    if (!rawProductId || !PRODUCT_ID_PATTERN.test(rawProductId)) {
      fieldErrors[`items[${index}].productId`] = 'Mã sản phẩm phải là chuỗi số hoặc UUID hợp lệ.';
      return;
    }

    if (
      isNaN(rawQuantity) ||
      !Number.isInteger(rawQuantity) ||
      rawQuantity < 1 ||
      rawQuantity > 999
    ) {
      fieldErrors[`items[${index}].quantity`] = 'Số lượng sản phẩm phải từ 1 đến 999.';
      return;
    }

    validatedItems.push({
      productId: rawProductId,
      quantity: rawQuantity,
    });
  });

  if (Object.keys(fieldErrors).length > 0) {
    throw new CartValidationError(
      400,
      'VALIDATION_ERROR',
      'Một hoặc nhiều sản phẩm trong danh sách gộp giỏ không hợp lệ.',
      fieldErrors,
    );
  }

  return {
    items: validatedItems,
  };
}
