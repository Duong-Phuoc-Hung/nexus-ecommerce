'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminSelect } from './admin-select';
import { useAdminCatalog } from './admin-catalog-context';
import { userMessage } from '../../../lib/axios/http';
import {
  validateProduct,
  type CatalogCategory,
  type ProductInput,
} from '../../catalog/api/catalog.factory';

type EditableField = keyof ProductInput;
const emptyForm: ProductInput = {
  title: '',
  description: '',
  categoryId: '',
  price: '',
  currency: 'VND',
  condition: 'NEW',
  images: [],
  status: 'ACTIVE',
  saleType: 'FIXED_PRICE',
  stockQuantity: 1,
};

export function ProductForm({ productId }: { productId?: string }) {
  const { api, productsPath } = useAdminCatalog();
  const router = useRouter();
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!productId) return;
    const controller = new AbortController();
    api
      .categories(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setCategories(rows);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(userMessage(reason));
      });
    if (productId) {
      api
        .detail(productId, controller.signal)
        .then((product) => {
          if (controller.signal.aborted) return;
          setForm({
            title: product.title,
            description: product.description,
            categoryId: product.categoryId,
            sellerId: product.sellerId,
            price: product.price == null ? '' : String(product.price),
            currency: product.currency || 'VND',
            condition: product.condition || 'NEW',
            images: product.images,
            status: product.status || 'ACTIVE',
            saleType: product.saleType === 'AUCTION' ? 'AUCTION' : 'FIXED_PRICE',
            stockQuantity: product.stockQuantity ?? 1,
          });
        })
        .catch((reason) => {
          if (!controller.signal.aborted) setError(userMessage(reason));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }
    return () => controller.abort();
  }, [api, productId]);

  function update<K extends EditableField>(key: K, value: ProductInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
    setError('');
    setSuccess('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId) return;
    const errors = validateProduct(form);
    if (!Number.isInteger(form.stockQuantity) || (form.stockQuantity ?? -1) < 0)
      errors.stockQuantity = 'Số lượng phải là số nguyên không âm.';
    setFieldErrors(errors);
    setError('');
    setSuccess('');
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      document.getElementById(`product-${firstError}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const saved = await api.save(form, productId);
      setSuccess(`Đã lưu thay đổi cho “${saved.title}”.`);
      router.refresh();
    } catch (reason) {
      setError(userMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  if (!productId) {
    return (
      <section className="admin-card">
        <p className="admin-eyebrow">CATALOG API</p>
        <h1>Tạo sản phẩm</h1>
        <p className="admin-notice" role="note">
          BE đã có API tạo sản phẩm, nhưng hiện tự gán người đang đăng nhập làm người bán và chưa có
          API tra cứu/chọn Seller cho Admin. Chưa thể tạo an toàn từ tài khoản Admin vì sản phẩm sẽ
          bị gán sai chủ sở hữu.
        </p>
        <Button asChild variant="outline" className="mt-5">
          <Link href={productsPath}>Về danh sách sản phẩm</Link>
        </Button>
      </section>
    );
  }

  const conditionOptions = [
    { value: 'NEW', label: 'Mới' },
    { value: 'LIKE_NEW', label: 'Như mới' },
    { value: 'USED', label: 'Đã qua sử dụng' },
    { value: 'REFURBISHED', label: 'Đã tân trang' },
  ];
  const statusOptions = [
    { value: 'ACTIVE', label: 'Đang hiển thị' },
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'INACTIVE', label: 'Tạm ngừng' },
  ];

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CATALOG · {productId}</p>
          <h1>Chỉnh sửa sản phẩm</h1>
          <p className="admin-muted">Dữ liệu được tải và lưu qua Catalog API.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={productsPath}>Về danh sách</Link>
        </Button>
      </div>
      <section className="admin-card">
        {loading ? (
          <p className="admin-empty" role="status">
            Đang tải sản phẩm…
          </p>
        ) : (
          <form onSubmit={submit} noValidate>
            {error && (
              <p className="admin-notice" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="admin-notice" role="status">
                {success}
              </p>
            )}
            <div className="admin-two-fields">
              <div className="admin-field">
                <label htmlFor="product-title">Tên sản phẩm</label>
                <Input
                  id="product-title"
                  value={form.title}
                  maxLength={255}
                  onChange={(e) => update('title', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                />
                {fieldErrors.title && (
                  <span className="admin-field-error">{fieldErrors.title}</span>
                )}
              </div>
              <div className="admin-field">
                <label htmlFor="product-categoryId">Danh mục</label>
                <AdminSelect
                  id="product-categoryId"
                  value={form.categoryId}
                  onValueChange={(v) => update('categoryId', v)}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: `${'— '.repeat(Math.max(0, c.level - 1))}${c.name}`,
                  }))}
                  placeholder="Chọn danh mục"
                  aria-invalid={Boolean(fieldErrors.categoryId)}
                  disabled={!categories.length}
                />
                {fieldErrors.categoryId && (
                  <span className="admin-field-error">{fieldErrors.categoryId}</span>
                )}
              </div>
            </div>
            <div className="admin-two-fields">
              <div className="admin-field">
                <label htmlFor="product-price">Giá (VND)</label>
                <Input
                  id="product-price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.price)}
                />
                {fieldErrors.price && (
                  <span className="admin-field-error">{fieldErrors.price}</span>
                )}
              </div>
              <div className="admin-field">
                <label htmlFor="product-stockQuantity">Số lượng tồn kho</label>
                <Input
                  id="product-stockQuantity"
                  type="number"
                  min={0}
                  step={1}
                  value={form.stockQuantity ?? ''}
                  onChange={(e) => update('stockQuantity', Number(e.target.value))}
                  aria-invalid={Boolean(fieldErrors.stockQuantity)}
                />
                {fieldErrors.stockQuantity && (
                  <span className="admin-field-error">{fieldErrors.stockQuantity}</span>
                )}
              </div>
            </div>
            <div className="admin-two-fields">
              <div className="admin-field">
                <label htmlFor="product-condition">Tình trạng</label>
                <AdminSelect
                  id="product-condition"
                  value={form.condition}
                  onValueChange={(v) => update('condition', v)}
                  options={conditionOptions}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="product-status">Trạng thái</label>
                <AdminSelect
                  id="product-status"
                  value={form.status}
                  onValueChange={(v) => update('status', v)}
                  options={statusOptions}
                />
              </div>
            </div>
            <div className="admin-field">
              <label htmlFor="product-saleType">Hình thức bán</label>
              <AdminSelect
                id="product-saleType"
                value={form.saleType}
                onValueChange={(v) => update('saleType', v)}
                options={[
                  { value: 'FIXED_PRICE', label: 'Mua ngay' },
                  { value: 'AUCTION', label: 'Đấu giá' },
                ]}
              />
            </div>
            <div className="admin-field">
              <label htmlFor="product-description">Mô tả</label>
              <Textarea
                id="product-description"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                aria-invalid={Boolean(fieldErrors.description)}
              />
              {fieldErrors.description && (
                <span className="admin-field-error">{fieldErrors.description}</span>
              )}
            </div>
            <div className="admin-field">
              <label htmlFor="product-images">Ảnh sản phẩm · mỗi URL một dòng</label>
              <Textarea
                id="product-images"
                value={form.images.join('\n')}
                onChange={(e) =>
                  update(
                    'images',
                    e.target.value
                      .split('\n')
                      .map((url) => url.trim())
                      .filter(Boolean),
                  )
                }
                aria-invalid={Boolean(fieldErrors.images)}
              />
              {fieldErrors.images && (
                <span className="admin-field-error">{fieldErrors.images}</span>
              )}
            </div>
            {!categories.length && (
              <p className="admin-muted mt-3">
                Đang chờ danh mục từ Catalog API; không dùng danh mục mẫu để tránh lưu sai ID.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button type="submit" disabled={saving || !categories.length}>
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
              <Button asChild variant="outline">
                <Link href={productsPath}>Hủy</Link>
              </Button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
