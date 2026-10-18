'use client';
import { AdminSelect } from './admin-select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAdminCatalog } from './admin-catalog-context';
import {
  validateProduct,
  type CatalogCategory,
  type ProductInput,
} from '../../../../../shared/catalog';
import { ApiError, userMessage } from '../../../../../shared/http';
const initial: ProductInput = {
  title: '',
  description: '',
  categoryId: '',
  sellerId: '',
  price: '',
  currency: 'VND',
  condition: 'NEW',
  images: [],
  status: 'DRAFT',
  saleType: 'FIXED_PRICE',
};
export function ProductForm({ productId }: { productId?: string }) {
  const { api: catalogApi, productsPath } = useAdminCatalog();
  const [values, setValues] = useState<ProductInput>(initial),
    [images, setImages] = useState(''),
    [categories, setCategories] = useState<CatalogCategory[]>([]),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(''),
    [categoryError, setCategoryError] = useState(''),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState(''),
    [success, setSuccess] = useState(false),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [createdId, setCreatedId] = useState('');
  const summary = useRef<HTMLParagraphElement>(null);
  const [priceLocked, setPriceLocked] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    setCategoryError('');
    const cats = catalogApi
      .categories(controller.signal)
      .then(setCategories)
      .catch((err) => {
        if (!controller.signal.aborted) {
          setCategories([]);
          setCategoryError(userMessage(err));
        }
      });
    const detail = productId
      ? catalogApi
          .detail(productId, controller.signal)
          .then((p) => {
            if (controller.signal.aborted) return;
            setPriceLocked(p.saleType === 'AUCTION' && p.status === 'ACTIVE');
            setValues({
              title: p.title,
              description: p.description,
              categoryId: p.categoryId,
              sellerId: p.sellerId,
              price: p.price === null ? '' : String(p.price),
              currency: p.currency || '',
              condition: p.condition || '',
              images: p.images,
              status: p.status,
              saleType: p.saleType === 'UNKNOWN' ? '' : p.saleType,
            });
            setImages(p.images.join('\n'));
          })
          .catch((err) => {
            if (!controller.signal.aborted) setLoadError(userMessage(err));
          })
      : Promise.resolve();
    Promise.all([cats, detail]).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [productId, revision, catalogApi]);
  function change<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: '' }));
    setNotice('');
    setSuccess(false);
  }
  function focusSummary() {
    requestAnimationFrame(() => summary.current?.focus());
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || createdId) return;
    const input = {
      ...values,
      images: images
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const validation = validateProduct(input);
    if (!input.sellerId?.trim()) validation.sellerId = 'Nhập mã người bán để hệ thống kiểm tra.';
    setErrors(validation);
    setSuccess(false);
    if (Object.keys(validation).length) {
      setNotice('Vui lòng kiểm tra các trường được đánh dấu.');
      focusSummary();
      return;
    }
    if (catalogApi.source === 'mock') {
      setNotice('Thông tin hợp lệ. Chức năng lưu hiện chưa khả dụng.');
      focusSummary();
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const saved = await catalogApi.save(input, productId);
      setSuccess(true);
      setNotice('Đã lưu thông tin sản phẩm trên hệ thống.');
      if (!productId) setCreatedId(saved.id);
      focusSummary();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.fieldErrors : {});
      setNotice(
        err instanceof ApiError && [404, 405, 501].includes(err.status || 0)
          ? 'Chức năng lưu sản phẩm chưa sẵn sàng. Thông tin bạn nhập vẫn được giữ trên biểu mẫu.'
          : err instanceof ApiError && err.status === 403
            ? 'Tài khoản chưa có quyền thực hiện thao tác này.'
            : err instanceof ApiError && !err.status
              ? 'Chưa xác nhận được kết quả lưu. Hãy kiểm tra danh sách trước khi gửi lại để tránh tạo trùng.'
              : userMessage(err),
      );
      focusSummary();
    } finally {
      setBusy(false);
    }
  }
  function field(key: keyof ProductInput, label: string, element: React.ReactNode) {
    return (
      <div className="admin-field">
        <label htmlFor={'product-' + key}>{label}</label>
        {element}
        {errors[key] && (
          <span className="admin-field-error" id={'product-error-' + key}>
            {errors[key]}
          </span>
        )}
      </div>
    );
  }
  const attr = (key: keyof ProductInput) => ({
    id: 'product-' + key,
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? 'product-error-' + key : undefined,
  });
  if (loading)
    return (
      <section className="admin-card admin-empty" role="status">
        Đang tải biểu mẫu sản phẩm…
      </section>
    );
  if (loadError)
    return (
      <section className="admin-card admin-empty" role="alert">
        <h1>Chưa mở được sản phẩm</h1>
        <p>{loadError}</p>
        <Button
          variant="ghost"
          size="plain"
          type="button"
          className="admin-button"
          onClick={() => setRevision((r) => r + 1)}
        >
          Thử lại
        </Button>
        <Link className="admin-edit-link" href={productsPath}>
          Về danh sách
        </Link>
      </section>
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">CATALOG / {productId ? 'CHỈNH SỬA' : 'TẠO MỚI'}</p>
          <h1>{productId ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}</h1>
          <p className="admin-muted">Thông tin rõ ràng giúp người mua dễ đối chiếu và lựa chọn.</p>
        </div>
        <Link href={productsPath} className="admin-button admin-button-outline">
          Về danh sách
        </Link>
      </div>

      <form onSubmit={submit} noValidate aria-busy={busy}>
        <fieldset disabled={busy || !!createdId} className="admin-form-fieldset">
          <div className="admin-form-grid">
            <div className="admin-form-main">
              <section className="admin-card">
                <h2>Thông tin cơ bản</h2>
                <p className="admin-muted">Các trường có dấu * cần được điền đầy đủ.</p>
                {field(
                  'title',
                  'Tên sản phẩm *',
                  <Input
                    {...attr('title')}
                    value={values.title}
                    maxLength={255}
                    onChange={(e) => change('title', e.target.value)}
                    placeholder="Ví dụ: Tai nghe Sony WH-1000XM5"
                  />,
                )}
                {field(
                  'description',
                  'Mô tả sản phẩm *',
                  <Textarea
                    {...attr('description')}
                    rows={7}
                    value={values.description}
                    onChange={(e) => change('description', e.target.value)}
                    placeholder="Mô tả đặc điểm, tình trạng và các thông tin người mua cần biết."
                  />,
                )}
                <div className="admin-two-fields">
                  {field(
                    'categoryId',
                    'Danh mục *',
                    <AdminSelect
                      {...attr('categoryId')}
                      value={values.categoryId}
                      onValueChange={(value) => change('categoryId', value)}
                      options={categories.map((c) => ({
                        value: c.id,
                        label: '— '.repeat(Math.max(c.level - 1, 0)) + c.name,
                      }))}
                      placeholder="Chọn danh mục"
                      disabled={!categories.length}
                    />,
                  )}
                  {field(
                    'condition',
                    'Tình trạng *',
                    <AdminSelect
                      {...attr('condition')}
                      value={values.condition}
                      onValueChange={(value) => change('condition', value)}
                      options={[
                        { value: 'NEW', label: 'Mới' },
                        { value: 'LIKE_NEW', label: 'Như mới' },
                        { value: 'USED', label: 'Đã qua sử dụng' },
                        { value: 'REFURBISHED', label: 'Tân trang' },
                      ]}
                      placeholder="Chọn tình trạng"
                    />,
                  )}
                </div>
                {categoryError && (
                  <p className="admin-alert" role="alert">
                    Chưa tải được danh mục.{' '}
                    <Button
                      variant="ghost"
                      size="plain"
                      type="button"
                      onClick={() => setRevision((r) => r + 1)}
                    >
                      Tải lại
                    </Button>
                  </p>
                )}
                {field(
                  'sellerId',
                  'Mã người bán *',
                  <Input
                    {...attr('sellerId')}
                    value={values.sellerId}
                    onChange={(e) => change('sellerId', e.target.value)}
                    placeholder="Mã tài khoản người bán"
                  />,
                )}
                <p className="admin-help">
                  Sử dụng mã người bán do nhóm quản trị cung cấp. Hệ thống sẽ kiểm tra tài khoản và
                  quyền sở hữu khi lưu.
                </p>
              </section>
              <section className="admin-card">
                <div className="admin-card-heading">
                  <h2>Hình ảnh</h2>
                  <span className="admin-muted">Tối đa 5 ảnh</span>
                </div>
                <p className="admin-muted">
                  Mỗi dòng một đường dẫn ảnh HTTP hoặc HTTPS. Chưa tải tệp trực tiếp.
                </p>
                {field(
                  'images',
                  'Đường dẫn ảnh',
                  <Textarea
                    {...attr('images')}
                    rows={4}
                    value={images}
                    onChange={(e) => {
                      setImages(e.target.value);
                      setErrors((v) => ({ ...v, images: '' }));
                      setNotice('');
                    }}
                    placeholder="https://.../san-pham.jpg"
                  />,
                )}
                <div className="admin-image-preview">
                  {images
                    .split('\n')
                    .map((s) => s.trim())
                    .filter((s) => /^https?:\/\//i.test(s))
                    .slice(0, 5)
                    .map((url, i) => (
                      <img
                        key={url + i}
                        src={url}
                        alt={'Ảnh xem trước ' + (i + 1)}
                        width={96}
                        height={96}
                      />
                    ))}
                </div>
              </section>
            </div>
            <aside className="admin-form-aside">
              <section className="admin-card">
                <h2>Giá và hiển thị</h2>
                {field(
                  'price',
                  'Giá sản phẩm *',
                  <Input
                    {...attr('price')}
                    type="text"
                    inputMode="decimal"
                    value={values.price}
                    disabled={priceLocked}
                    onChange={(e) => change('price', e.target.value)}
                    placeholder="18500000"
                  />,
                )}
                {field(
                  'currency',
                  'Đơn vị tiền *',
                  <AdminSelect
                    {...attr('currency')}
                    value={values.currency}
                    onValueChange={(value) => change('currency', value)}
                    options={[
                      { value: 'VND', label: 'VND — Việt Nam đồng' },
                      { value: 'USD', label: 'USD — Đô la Mỹ' },
                    ]}
                    placeholder="Chọn đơn vị tiền"
                    disabled={priceLocked}
                  />,
                )}
                <p className="admin-help">Chọn đơn vị tiền áp dụng cho giá sản phẩm.</p>
                {field(
                  'saleType',
                  'Hình thức giao dịch *',
                  <AdminSelect
                    {...attr('saleType')}
                    value={values.saleType}
                    onValueChange={(value) => change('saleType', value)}
                    options={[
                      { value: 'FIXED_PRICE', label: 'Mua sắm' },
                      { value: 'AUCTION', label: 'Dành cho đấu giá' },
                    ]}
                    placeholder="Chọn hình thức"
                    disabled={priceLocked}
                  />,
                )}
                {field(
                  'status',
                  'Trạng thái hiển thị *',
                  <AdminSelect
                    {...attr('status')}
                    value={values.status}
                    onValueChange={(value) => change('status', value)}
                    options={[
                      { value: 'DRAFT', label: 'Bản nháp' },
                      { value: 'ACTIVE', label: 'Đang hiển thị' },
                      { value: 'INACTIVE', label: 'Tạm ngừng' },
                    ]}
                    placeholder="Chọn trạng thái"
                  />,
                )}
                {priceLocked && (
                  <p className="admin-notice">
                    Sản phẩm đang hiển thị ở khu đấu giá. Không sửa giá hoặc hình thức giao dịch tại
                    biểu mẫu này.
                  </p>
                )}
                <p className="admin-help">
                  Chọn hình thức đấu giá không tự tạo hay kích hoạt phiên. Phiên đấu có quy trình và
                  điều kiện riêng.
                </p>
              </section>
              <section className="admin-card admin-save-card">
                <h2>Hoàn tất thông tin</h2>
                <p className="admin-muted">Kiểm tra nội dung và hình ảnh trước khi lưu.</p>
                <Button
                  variant="ghost"
                  size="plain"
                  type="submit"
                  className="admin-button admin-button-full"
                  disabled={!categories.length}
                >
                  {busy
                    ? 'Đang lưu…'
                    : catalogApi.source === 'mock'
                      ? 'Kiểm tra thông tin'
                      : 'Lưu sản phẩm'}
                </Button>
              </section>
            </aside>
          </div>
        </fieldset>
        {notice && (
          <p
            ref={summary}
            tabIndex={-1}
            role={success ? 'status' : 'alert'}
            className={'admin-alert ' + (success ? 'admin-alert-success' : '')}
          >
            {notice}
            {createdId && (
              <Link href={productsPath} className="admin-edit-link">
                Quay lại danh sách
              </Link>
            )}
          </p>
        )}
      </form>
    </>
  );
}
