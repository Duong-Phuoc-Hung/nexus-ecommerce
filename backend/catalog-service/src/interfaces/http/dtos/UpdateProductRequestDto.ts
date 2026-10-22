import { ProductStatus } from '../../../domain/entities/Product';

export interface UpdateProductRequestDto {
  title?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  currency?: string;
  stockQuantity?: number;
  status?: ProductStatus;
  condition?: string;
  saleType?: string;
  images?: string[];
  primaryImage?: string;
  attributes?: Record<string, string>;
  slug?: string;
  allowAuction?: boolean;
  expectedUpdatedAt?: string;
  version?: number;
}

export interface UpdateValidationResult {
  valid: boolean;
  value?: UpdateProductRequestDto;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export function parseUpdateProductRequest(body: unknown): UpdateValidationResult {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Dữ liệu yêu cầu không hợp lệ (cần JSON body).' };
  }

  const b = body as Record<string, any>;
  const fieldErrors: Record<string, string> = {};
  const updates: UpdateProductRequestDto = {};

  if (b.title !== undefined) {
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    if (!title || title.length > 255) {
      fieldErrors.title = 'Tên sản phẩm từ 1 đến 255 ký tự.';
    } else {
      updates.title = title;
    }
  }

  if (b.description !== undefined) {
    const desc = typeof b.description === 'string' ? b.description.trim() : '';
    if (!desc) {
      fieldErrors.description = 'Mô tả sản phẩm không được rỗng.';
    } else {
      updates.description = desc;
    }
  }

  if (b.categoryId !== undefined) {
    const catId =
      typeof b.categoryId === 'string' || typeof b.categoryId === 'number'
        ? String(b.categoryId).trim()
        : '';
    if (!catId) {
      fieldErrors.categoryId = 'Danh mục không hợp lệ.';
    } else {
      updates.categoryId = catId;
    }
  }

  if (b.price !== undefined) {
    const priceNum = Number(b.price);
    if (isNaN(priceNum) || priceNum <= 0 || !Number.isFinite(priceNum)) {
      fieldErrors.price = 'Giá bán phải là số dương lớn hơn 0.';
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(b.price))) {
      fieldErrors.price = 'Mức giá tối đa 2 chữ số thập phân.';
    } else {
      updates.price = priceNum;
    }
  }

  if (b.currency !== undefined) {
    const curr = typeof b.currency === 'string' ? b.currency.trim().toUpperCase() : '';
    if (/^[A-Z]{3}$/.test(curr)) {
      updates.currency = curr;
    } else {
      fieldErrors.currency = 'Đơn vị tiền tệ phải là mã 3 ký tự (ví dụ: VND, USD).';
    }
  }

  if (b.stockQuantity !== undefined) {
    const stock = Number(b.stockQuantity);
    if (isNaN(stock) || stock < 0 || !Number.isInteger(stock)) {
      fieldErrors.stockQuantity = 'Tồn kho phải là số nguyên không âm (>= 0).';
    } else {
      updates.stockQuantity = stock;
    }
  }

  if (b.status !== undefined) {
    if (Object.values(ProductStatus).includes(b.status)) {
      updates.status = b.status as ProductStatus;
    } else {
      fieldErrors.status = 'Trạng thái không hợp lệ (DRAFT, ACTIVE, ARCHIVED, OUT_OF_STOCK).';
    }
  }

  if (b.condition !== undefined) {
    const validConditions = ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'];
    if (validConditions.includes(b.condition)) {
      updates.condition = b.condition;
    } else {
      fieldErrors.condition = 'Tình trạng không hợp lệ (NEW, LIKE_NEW, USED, REFURBISHED).';
    }
  }

  if (b.saleType !== undefined) {
    const validSaleTypes = ['FIXED_PRICE', 'AUCTION'];
    if (validSaleTypes.includes(b.saleType)) {
      updates.saleType = b.saleType;
      updates.allowAuction = b.saleType === 'AUCTION';
    } else {
      fieldErrors.saleType = 'Hình thức giao dịch không hợp lệ (FIXED_PRICE, AUCTION).';
    }
  }

  if (b.images !== undefined) {
    if (Array.isArray(b.images)) {
      const rawImages = b.images.filter((img) => typeof img === 'string' && img.trim().length > 0);
      if (rawImages.length > 5) {
        fieldErrors.images = 'Mỗi sản phẩm tối đa 5 ảnh theo cấu hình mặc định SRS.';
      }

      const invalidUrl = rawImages.some((url) => {
        try {
          return !['http:', 'https:'].includes(new URL(url).protocol);
        } catch {
          return true;
        }
      });

      if (invalidUrl) {
        fieldErrors.images = 'Mỗi ảnh cần một đường dẫn HTTP hoặc HTTPS hợp lệ.';
      }

      updates.images = rawImages;
      if (b.primaryImage === undefined && rawImages.length > 0) {
        updates.primaryImage = rawImages[0];
      }
    } else {
      fieldErrors.images = 'Danh sách ảnh phải là mảng chuỗi URL.';
    }
  }

  if (b.primaryImage !== undefined) {
    updates.primaryImage = typeof b.primaryImage === 'string' ? b.primaryImage.trim() : undefined;
  }

  if (b.attributes !== undefined && typeof b.attributes === 'object') {
    const attrs: Record<string, string> = {};
    for (const [k, v] of Object.entries(b.attributes)) {
      attrs[k] = String(v);
    }
    updates.attributes = attrs;
  }

  if (b.slug !== undefined) {
    updates.slug = typeof b.slug === 'string' ? b.slug.trim() : undefined;
  }

  if (b.allowAuction !== undefined) {
    updates.allowAuction = Boolean(b.allowAuction);
  }

  if (b.expectedUpdatedAt !== undefined) {
    updates.expectedUpdatedAt = String(b.expectedUpdatedAt);
  }

  if (b.version !== undefined) {
    updates.version = Number(b.version);
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      error: 'Thông tin cập nhật sản phẩm chưa hợp lệ.',
      fieldErrors,
    };
  }

  return {
    valid: true,
    value: updates,
  };
}
