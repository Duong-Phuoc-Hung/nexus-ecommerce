import { ProductStatus } from '../../../domain/entities/Product';

export interface CreateProductRequestDto {
  title: string;
  description: string;
  categoryId: string;
  sellerId?: string;
  price: number;
  currency?: string;
  stockQuantity: number;
  status?: ProductStatus;
  condition?: string;
  saleType?: string;
  images?: string[];
  primaryImage?: string;
  attributes?: Record<string, string>;
  slug?: string;
  allowAuction?: boolean;
}

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export function parseCreateProductRequest(
  body: unknown,
): ValidationResult<CreateProductRequestDto> {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Dữ liệu yêu cầu không hợp lệ (cần JSON body).' };
  }

  const b = body as Record<string, any>;
  const fieldErrors: Record<string, string> = {};

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > 255) {
    fieldErrors.title = 'Tên sản phẩm bắt buộc, từ 1 đến 255 ký tự.';
  }

  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!description) {
    fieldErrors.description = 'Mô tả sản phẩm không được để trống.';
  }

  const categoryId =
    typeof b.categoryId === 'string' || typeof b.categoryId === 'number'
      ? String(b.categoryId).trim()
      : '';
  if (!categoryId) {
    fieldErrors.categoryId = 'Vui lòng chọn danh mục sản phẩm.';
  }

  const priceNum = Number(b.price);
  if (isNaN(priceNum) || priceNum <= 0 || !Number.isFinite(priceNum)) {
    fieldErrors.price = 'Giá bán phải là số dương lớn hơn 0.';
  } else if (!/^\d+(\.\d{1,2})?$/.test(String(b.price))) {
    fieldErrors.price = 'Mức giá tối đa 2 chữ số thập phân.';
  }

  const currency =
    typeof b.currency === 'string' && /^[A-Z]{3}$/.test(b.currency.trim())
      ? b.currency.trim().toUpperCase()
      : 'VND';

  const stockQuantity = b.stockQuantity !== undefined ? Number(b.stockQuantity) : 0;
  if (isNaN(stockQuantity) || stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
    fieldErrors.stockQuantity = 'Số lượng tồn kho phải là số nguyên không âm (>= 0).';
  }

  const status = Object.values(ProductStatus).includes(b.status)
    ? (b.status as ProductStatus)
    : ProductStatus.DRAFT;

  const validConditions = ['NEW', 'LIKE_NEW', 'USED', 'REFURBISHED'];
  const condition = validConditions.includes(b.condition) ? b.condition : 'NEW';

  const validSaleTypes = ['FIXED_PRICE', 'AUCTION'];
  const saleType = validSaleTypes.includes(b.saleType)
    ? b.saleType
    : b.allowAuction
      ? 'AUCTION'
      : 'FIXED_PRICE';

  const rawImages: string[] = Array.isArray(b.images)
    ? b.images.filter((img) => typeof img === 'string' && img.trim().length > 0)
    : [];

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

  const primaryImage =
    typeof b.primaryImage === 'string' && b.primaryImage.trim().length > 0
      ? b.primaryImage.trim()
      : rawImages.length > 0
        ? rawImages[0]
        : undefined;

  const attributes: Record<string, string> = {};
  if (b.attributes && typeof b.attributes === 'object') {
    for (const [key, val] of Object.entries(b.attributes)) {
      if (typeof val === 'string' || typeof val === 'number') {
        attributes[key] = String(val);
      }
    }
  }

  const slug = typeof b.slug === 'string' && b.slug.trim().length > 0 ? b.slug.trim() : undefined;
  const allowAuction = saleType === 'AUCTION' || Boolean(b.allowAuction);
  const sellerId =
    typeof b.sellerId === 'string' && b.sellerId.trim().length > 0 ? b.sellerId.trim() : undefined;

  if (Object.keys(fieldErrors).length > 0) {
    return {
      valid: false,
      error: 'Thông tin sản phẩm chưa hợp lệ.',
      fieldErrors,
    };
  }

  return {
    valid: true,
    value: {
      title,
      description,
      categoryId,
      sellerId,
      price: priceNum,
      currency,
      stockQuantity,
      status,
      condition,
      saleType,
      images: rawImages,
      primaryImage,
      attributes,
      slug,
      allowAuction,
    },
  };
}
