'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import {
  sellerProductsApi,
  type FlatCategory,
  type BackendProduct,
} from '../api/seller-products.api';
import { userMessage } from '@/lib/axios/http';
import {
  products as mockProducts,
  PageHeading,
  DemoNote,
  optimizeImageFile,
} from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SellerProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [productData, setProductData] = useState<Partial<BackendProduct> | null>(null);
  const [productLoading, setProductLoading] = useState(Boolean(productId));
  const [productError, setProductError] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ACTIVE');
  const [imageUrl, setImageUrl] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // 1. API 1: GET /api/v1/categories?tree=true
  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);

    sellerProductsApi
      .getCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setCategories(data);
          if (!selectedCategory && data.length > 0) {
            setSelectedCategory(data[0].id);
          }
        }
      })
      .catch(() => {
        // Fallback default danh mục
        if (!controller.signal.aborted) {
          const fallbackCats = [
            { id: '1', name: 'Thiết bị điện tử', rawName: 'Điện tử', level: 0 },
            { id: '100', name: '— iPhone', rawName: 'iPhone', level: 1 },
            { id: '102', name: '— MacBook', rawName: 'MacBook', level: 1 },
            { id: '16', name: 'Đồng hồ cao cấp', rawName: 'Đồng hồ', level: 0 },
            { id: '2', name: 'Thời trang & Phụ kiện', rawName: 'Thời trang', level: 0 },
          ];
          setCategories(fallbackCats);
          if (!selectedCategory) {
            setSelectedCategory(fallbackCats[0].id);
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // 2. API 5: GET /api/v1/products/:id
  useEffect(() => {
    if (!productId) return;

    const controller = new AbortController();
    setProductLoading(true);
    setProductError('');

    sellerProductsApi
      .getById(productId, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setProductData(detail);
          if (detail.categoryId) setSelectedCategory(String(detail.categoryId));
          if (detail.status) setSelectedStatus(detail.status);
          const isRemoved =
            typeof window !== 'undefined' &&
            localStorage.getItem(`nexus_prod_img_removed_${productId}`) === 'true';

          if (!isRemoved) {
            const cachedImg =
              typeof window !== 'undefined'
                ? localStorage.getItem(`nexus_prod_img_${productId}`) || ''
                : '';
            const initialImg = cachedImg || detail.primaryImage || detail.images?.[0] || '';
            if (initialImg) setImageUrl(initialImg);
          } else {
            setImageUrl('');
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          // Fallback sang mock nếu ID là mẫu mock
          const fallback = mockProducts.find((p) => p.id === productId);
          if (fallback) {
            setProductData({
              id: fallback.id,
              title: fallback.name,
              slug: fallback.sku,
              categoryId: fallback.category,
              price: fallback.price,
              stockQuantity: fallback.stock,
              status: fallback.status,
            });
            if (fallback.category) setSelectedCategory(fallback.category);
            if (fallback.status) setSelectedStatus(fallback.status);
            const isRemoved =
              typeof window !== 'undefined' &&
              localStorage.getItem(`nexus_prod_img_removed_${productId}`) === 'true';

            if (!isRemoved) {
              const cachedImg =
                typeof window !== 'undefined'
                  ? localStorage.getItem(`nexus_prod_img_${productId}`) || ''
                  : '';
              const initialImg = cachedImg || '';
              if (initialImg) setImageUrl(initialImg);
            } else {
              setImageUrl('');
            }
          } else {
            setProductError(userMessage(err));
          }
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProductLoading(false);
        }
      });

    return () => controller.abort();
  }, [productId]);

  const isEditMode = Boolean(productId);
  const title = isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới';

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(['Vui lòng chọn tệp định dạng hình ảnh (JPG, PNG, WebP,...).']);
      return;
    }
    try {
      const optimized = await optimizeImageFile(file);
      setImageUrl(optimized);
      setErrors([]);
    } catch {
      setErrors(['Không thể xử lý tệp ảnh. Vui lòng thử lại với tệp ảnh khác.']);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextErrors: string[] = [];

    const name = String(data.get('name') ?? '').trim();
    const sku = String(data.get('sku') ?? '').trim();
    const category = selectedCategory || String(data.get('category') ?? '').trim();
    const price = Number(data.get('price'));
    const stock = Number(data.get('stock'));
    const description = String(data.get('description') ?? '').trim() || `Sản phẩm ${name}`;
    const status = selectedStatus || 'ACTIVE';

    if (!name) nextErrors.push('Nhập tên sản phẩm.');
    if (!sku) nextErrors.push('Nhập mã SKU/Slug.');
    if (!category) nextErrors.push('Vui lòng chọn danh mục sản phẩm.');
    if (!price || price <= 0) nextErrors.push('Giá bán phải lớn hơn 0.');
    if (stock < 0) nextErrors.push('Tồn kho không được âm.');

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      setSuccessMessage('');
      return;
    }

    setErrors([]);
    setSubmitting(true);
    setSuccessMessage('');

    try {
      // Backend PostgreSQL catalog_product_images giới hạn image_url VARCHAR(500) và Express json 100KB.
      // Chỉ gửi mảng images lên BE nếu là link URL hợp lệ (http/https) <= 500 ký tự.
      // Đối với ảnh tải từ máy tính, ảnh đã được canvas nén siêu nhẹ và lưu vào LocalStorage để hiển thị tức thì.
      const isHttpUrl = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
      const backendImages = isHttpUrl && imageUrl.length <= 500 ? [imageUrl] : undefined;

      if (isEditMode && productId) {
        // API 7: PUT /api/v1/products/:id
        await sellerProductsApi.update(productId, {
          title: name,
          description,
          categoryId: category,
          price,
          stockQuantity: stock,
          status,
          images: backendImages,
        });

        if (typeof window !== 'undefined') {
          if (imageUrl) {
            localStorage.removeItem(`nexus_prod_img_removed_${productId}`);
            localStorage.setItem(`nexus_prod_img_${productId}`, imageUrl);
            localStorage.setItem(`nexus_prod_img_${sku}`, imageUrl);
            localStorage.setItem(`nexus_prod_img_${name}`, imageUrl);
          } else {
            // Đánh dấu ảnh đã bị xóa để trang danh sách và form không hiển thị lại ảnh cũ
            localStorage.setItem(`nexus_prod_img_removed_${productId}`, 'true');
            localStorage.removeItem(`nexus_prod_img_${productId}`);
            localStorage.removeItem(`nexus_prod_img_${sku}`);
            localStorage.removeItem(`nexus_prod_img_${name}`);
          }
        }
        setSuccessMessage('Cập nhật sản phẩm thành công!');
      } else {
        // API 6: POST /api/v1/products
        const created = await sellerProductsApi.create({
          title: name,
          description,
          categoryId: category,
          price,
          stockQuantity: stock,
          condition: 'NEW',
          images: backendImages,
        });

        if (typeof window !== 'undefined' && imageUrl) {
          if (created?.id) {
            localStorage.removeItem(`nexus_prod_img_removed_${created.id}`);
            localStorage.setItem(`nexus_prod_img_${created.id}`, imageUrl);
          }
          localStorage.setItem(`nexus_prod_img_${sku}`, imageUrl);
          localStorage.setItem(`nexus_prod_img_${name}`, imageUrl);
        }
        // Tự động chuyển hướng về trang danh sách sản phẩm theo yêu cầu
        router.push('/seller/products');
        return;
      }
    } catch (err) {
      setErrors([userMessage(err)]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="SELLER CENTER / CATALOG"
        title={title}
        description="Tạo hoặc cập nhật nội dung sản phẩm. Danh mục và thông tin chi tiết được kết nối trực tiếp với Catalog API."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/products">
            ← Danh sách
          </Link>
        }
      />
      <DemoNote message="Tích hợp đầy đủ API: Danh mục (tree=true), Chi tiết sản phẩm (GET :id), Tạo mới (POST /products) và Cập nhật (PUT /products/:id)." />

      {productLoading && (
        <p className="seller-loading" style={{ margin: '16px 0' }}>
          Đang tải thông tin sản phẩm từ Product API...
        </p>
      )}

      {productError && (
        <p className="seller-readonly-note" style={{ color: '#d9383a', margin: '16px 0' }}>
          {productError.includes('không tìm thấy') ||
          productError.includes('not found') ||
          productError.includes('404')
            ? `Sản phẩm #${productId} không tìm thấy hoặc đang ở trạng thái Đã xóa. Vui lòng quay lại danh sách sản phẩm để khôi phục trước khi sửa.`
            : `${productError} (đang dùng thông số dự phòng)`}
        </p>
      )}

      {!productLoading && (
        <form className="seller-panel seller-form" onSubmit={submit} noValidate>
          <div className="seller-panel-heading">
            <div>
              <p className="seller-eyebrow">CATALOG EDIT</p>
              <h2>{isEditMode ? 'Thông tin sản phẩm hiện tại' : 'Khởi tạo thông tin sản phẩm'}</h2>
            </div>
            <span className="seller-muted">
              {isEditMode ? `ID: ${productId}` : 'Đăng bán ngay vào kho'}
            </span>
          </div>

          <div className="seller-form-grid">
            <label>
              Tên sản phẩm *
              <input
                key={`name-${productData?.title ?? ''}`}
                name="name"
                defaultValue={productData?.title ?? ''}
                placeholder="Ví dụ: Tai nghe chống ồn Sony WH-1000XM5"
              />
            </label>

            <label>
              Mã SKU / Slug *
              <input
                key={`sku-${productData?.slug ?? ''}`}
                name="sku"
                defaultValue={productData?.slug ?? (productData?.id ? `SKU-${productData.id}` : '')}
                placeholder="Ví dụ: IPHONE-15-PRO-MAX"
              />
            </label>

            <label>
              Danh mục {categoriesLoading ? '(Đang tải danh mục...)' : ''}
              <div style={{ marginTop: '6px' }}>
                <Select
                  value={selectedCategory || (categories[0]?.id ?? '')}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger aria-label="Danh mục sản phẩm">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </label>

            <label>
              Giá bán (₫) *
              <input
                key={`price-${productData?.price ?? ''}`}
                name="price"
                type="number"
                min="1"
                defaultValue={productData?.price ?? ''}
                placeholder="0"
              />
            </label>

            <label>
              Số lượng tồn *
              <input
                key={`stock-${productData?.stockQuantity ?? ''}`}
                name="stock"
                type="number"
                min="0"
                defaultValue={productData?.stockQuantity ?? 10}
                placeholder="0"
              />
            </label>

            <div className="seller-form-full">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                Hình ảnh sản phẩm
              </label>
              <div className="seller-image-upload-zone">
                {imageUrl ? (
                  <img src={imageUrl} alt="Preview" className="seller-image-preview-lg" />
                ) : (
                  <div
                    className="seller-thumb-placeholder"
                    style={{ width: 72, height: 72, fontSize: '1.75rem' }}
                  >
                    📷
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <label
                      className="seller-button seller-button-quiet"
                      style={{
                        cursor: 'pointer',
                        margin: 0,
                        padding: '7px 14px',
                        fontSize: '0.75rem',
                      }}
                    >
                      📁 Chọn ảnh từ máy tính
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleImageFileChange}
                      />
                    </label>
                    {imageUrl && (
                      <button
                        type="button"
                        className="seller-button seller-button-quiet"
                        style={{
                          color: '#d9383a',
                          borderColor: '#fca5a5',
                          padding: '7px 12px',
                          fontSize: '0.75rem',
                        }}
                        onClick={() => setImageUrl('')}
                      >
                        ✕ Xóa ảnh
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="url"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value.trim())}
                      placeholder="Hoặc dán URL ảnh trực tiếp (https://...)"
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                      }}
                    />
                  </div>
                  <small
                    style={{
                      display: 'block',
                      marginTop: '6px',
                      color: '#8892a0',
                      fontSize: '0.67rem',
                    }}
                  >
                    Hỗ trợ tải tệp ảnh từ máy (JPG, PNG, WebP) hoặc nhập URL ảnh trực tiếp. Ảnh sẽ
                    hiển thị ngay tại cột Hình ảnh trên danh sách sản phẩm.
                  </small>
                </div>
              </div>
            </div>

            <label className="seller-form-full">
              Mô tả *
              <textarea
                key={`desc-${productData?.description ?? ''}`}
                name="description"
                rows={4}
                defaultValue={productData?.description ?? ''}
                placeholder="Mô tả đặc điểm và thông tin chi tiết sản phẩm"
              />
            </label>

            <label>
              Trạng thái
              <div style={{ marginTop: '6px' }}>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger aria-label="Trạng thái sản phẩm">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Đang bán</SelectItem>
                    <SelectItem value="DRAFT">Bản nháp</SelectItem>
                    <SelectItem value="ARCHIVED">Lưu trữ</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </label>
          </div>

          {errors.length > 0 && (
            <div className="seller-form-alert error" role="alert">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          {successMessage && (
            <div className="seller-form-alert success" role="status">
              {successMessage}
            </div>
          )}

          <div className="seller-form-actions">
            <button
              className="seller-button seller-button-primary"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? 'Đang lưu sản phẩm...'
                : isEditMode
                  ? 'Lưu thay đổi (PUT API)'
                  : 'Đăng bán sản phẩm (POST API)'}
            </button>
            <Link className="seller-button seller-button-quiet" href="/seller/products">
              Hủy
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
