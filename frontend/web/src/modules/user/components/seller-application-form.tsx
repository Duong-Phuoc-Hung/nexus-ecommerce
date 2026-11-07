'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Info,
  MapPin,
  Phone,
  ShieldAlert,
  Store,
  Tags,
  UserCheck,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { catalogApi } from '../../catalog/api/catalog.api';
import { provinceByCode, provinces } from '../data/locations';
import type {
  SellerApplicationFormInput,
  SellerApplicationShopSnapshot,
} from '../types/seller-application.types';

const FALLBACK_CATEGORIES = [
  { id: 'cat_electronics', name: 'Thiết bị điện tử & Công nghệ' },
  { id: 'cat_fashion', name: 'Thời trang & Phụ kiện' },
  { id: 'cat_collectibles', name: 'Đồ sưu tầm & Đấu giá nghệ thuật' },
  { id: 'cat_home', name: 'Nhà cửa & Đời sống' },
  { id: 'cat_watch_luxury', name: 'Đồng hồ & Trang sức' },
  { id: 'cat_books_media', name: 'Sách, Đĩa nhạc & Ấn phẩm' },
];

const VN_PHONE_REGEX = /^(?:0|\+84)\d{9}$/;

interface SellerApplicationFormProps {
  mode: 'create' | 'resubmit';
  accountEmail: string;
  accountFullName: string;
  accountPhone?: string;
  emailVerified?: boolean;
  initialSnapshot?: SellerApplicationShopSnapshot | null;
  expectedVersion?: number;
  rejectionReason?: string | null;
  isSubmitting: boolean;
  serverFieldErrors?: Record<string, string>;
  serverErrorMessage?: string;
  onSubmit: (payload: SellerApplicationFormInput) => Promise<void>;
  onCancelEdit?: () => void;
}

export function SellerApplicationForm({
  mode,
  accountEmail,
  accountFullName,
  accountPhone = '',
  emailVerified = true,
  initialSnapshot,
  expectedVersion,
  rejectionReason,
  isSubmitting,
  serverFieldErrors,
  serverErrorMessage,
  onSubmit,
  onCancelEdit,
}: SellerApplicationFormProps) {
  const formId = useId();
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const [shopName, setShopName] = useState(initialSnapshot?.shopName ?? '');
  const [contactName, setContactName] = useState(
    initialSnapshot?.contactName || accountFullName || '',
  );
  const [contactPhone, setContactPhone] = useState(
    initialSnapshot?.contactPhone || accountPhone || '',
  );
  const [provinceCode, setProvinceCode] = useState(
    initialSnapshot?.pickupAddress?.provinceCode || provinces[0]?.code || '',
  );
  const [wardCode, setWardCode] = useState(
    initialSnapshot?.pickupAddress?.wardCode || provinces[0]?.wards[0]?.code || '',
  );
  const [street, setStreet] = useState(initialSnapshot?.pickupAddress?.street ?? '');
  const [note, setNote] = useState(initialSnapshot?.pickupAddress?.note ?? '');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    initialSnapshot?.categoryIds ?? [],
  );
  const [shopDescription, setShopDescription] = useState(initialSnapshot?.shopDescription ?? '');
  const [acceptedTerms, setAcceptedTerms] = useState(
    mode === 'resubmit' ? Boolean(initialSnapshot?.acceptedTerms) : false,
  );

  const [categories, setCategories] =
    useState<Array<{ id: string; name: string }>>(FALLBACK_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setLoadingCategories(true);
    catalogApi
      .categories()
      .then((items) => {
        if (!active) return;
        if (Array.isArray(items) && items.length > 0) {
          setCategories(
            items.map((item) => ({
              id: String(item.id),
              name: item.name,
            })),
          );
        }
      })
      .catch(() => {
        // Keep FALLBACK_CATEGORIES if catalog service is unreachable
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (serverFieldErrors && Object.keys(serverFieldErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...serverFieldErrors }));
      errorSummaryRef.current?.focus();
    }
  }, [serverFieldErrors]);

  const currentProvince = useMemo(
    () => provinceByCode(provinceCode) ?? provinces[0],
    [provinceCode],
  );

  const currentWards = useMemo(() => currentProvince?.wards ?? [], [currentProvince]);

  const currentWard = useMemo(
    () => currentWards.find((w) => w.code === wardCode) ?? currentWards[0],
    [currentWards, wardCode],
  );

  const handleProvinceChange = (nextProvinceCode: string) => {
    const nextProvince = provinceByCode(nextProvinceCode);
    setProvinceCode(nextProvinceCode);
    setWardCode(nextProvince?.wards[0]?.code ?? '');
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.provinceCode;
      delete next.wardCode;
      return next;
    });
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      const exists = prev.includes(catId);
      const next = exists
        ? prev.filter((item) => item !== catId)
        : prev.length < 10
          ? [...prev, catId]
          : prev;
      return next;
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.categoryIds;
      return next;
    });
  };

  const validateClient = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const trimmedShop = shopName.trim();
    if (!trimmedShop) {
      errors.shopName = 'Tên cửa hàng là bắt buộc.';
    } else if (trimmedShop.length < 3 || trimmedShop.length > 80) {
      errors.shopName = 'Tên cửa hàng cần từ 3 đến 80 ký tự.';
    }

    const trimmedContact = contactName.trim();
    if (!trimmedContact || trimmedContact.length < 2 || trimmedContact.length > 100) {
      errors.contactName = 'Tên người liên hệ cần từ 2 đến 100 ký tự.';
    }

    const normalizedPhone = contactPhone.trim().replace(/[\s.-]/g, '');
    if (!normalizedPhone) {
      errors.contactPhone = 'Số điện thoại liên hệ là bắt buộc.';
    } else if (!VN_PHONE_REGEX.test(normalizedPhone)) {
      errors.contactPhone =
        'Số điện thoại liên hệ cần đúng định dạng Việt Nam (10 chữ số bắt đầu bằng 0 hoặc +84).';
    }

    if (!currentProvince?.code) {
      errors.provinceCode = 'Vui lòng chọn Tỉnh/Thành phố lấy hàng.';
    }
    if (!currentWard?.code) {
      errors.wardCode = 'Vui lòng chọn Phường/Xã lấy hàng.';
    }

    const trimmedStreet = street.trim();
    if (!trimmedStreet || trimmedStreet.length < 5 || trimmedStreet.length > 180) {
      errors.street = 'Địa chỉ cụ thể cần từ 5 đến 180 ký tự.';
    }

    if (selectedCategoryIds.length === 0) {
      errors.categoryIds = 'Vui lòng chọn ít nhất 1 danh mục sản phẩm dự kiến kinh doanh.';
    } else if (selectedCategoryIds.length > 10) {
      errors.categoryIds = 'Tối đa chọn 10 danh mục sản phẩm.';
    }

    if (shopDescription.trim().length > 1000) {
      errors.shopDescription = 'Giới thiệu cửa hàng không vượt quá 1000 ký tự.';
    }

    if (!acceptedTerms) {
      errors.acceptedTerms = 'Bạn cần xác nhận đồng ý điều kiện chuyển đổi sang tài khoản Seller.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateClient();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      errorSummaryRef.current?.focus();
      return;
    }

    const selectedCategoryNames = selectedCategoryIds.map((id) => {
      const found = categories.find((c) => c.id === id);
      return found ? found.name : id;
    });

    await onSubmit({
      shopName: shopName.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim().replace(/[\s.-]/g, ''),
      pickupAddress: {
        provinceCode: currentProvince?.code ?? provinceCode,
        provinceName: currentProvince?.name ?? '',
        wardCode: currentWard?.code ?? wardCode,
        wardName: currentWard?.name ?? '',
        street: street.trim(),
        note: note.trim() || undefined,
      },
      categoryIds: selectedCategoryIds,
      categoryNames: selectedCategoryNames,
      shopDescription: shopDescription.trim() || undefined,
      acceptedTerms: true,
      expectedVersion,
    });
  };

  const hasErrors = Object.keys(fieldErrors).length > 0 || Boolean(serverErrorMessage);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6 rounded-2xl border border-line bg-white p-6 shadow-xs"
    >
      {/* Header & Role Transition Notice */}
      <div className="space-y-3 border-b border-line pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
              <Store className="size-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">
                {mode === 'resubmit'
                  ? 'Điều chỉnh và gửi lại hồ sơ bán hàng'
                  : 'Hồ sơ đăng ký bán hàng trên Nexus'}
              </h2>
              <p className="text-xs text-muted">
                Điền thông tin cửa hàng để Quản trị viên xét duyệt mở kênh Người bán
              </p>
            </div>
          </div>
          <Badge variant="info">
            {mode === 'resubmit'
              ? `Cập nhật từ phiên bản v${expectedVersion ?? 1}`
              : 'Hồ sơ mới (MVP)'}
          </Badge>
        </div>

        {rejectionReason && mode === 'resubmit' ? (
          <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900">
            <p className="font-semibold">Lý do cần điều chỉnh từ Quản trị viên:</p>
            <p className="mt-1 leading-relaxed">{rejectionReason}</p>
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
            <div className="space-y-1.5">
              <p className="font-semibold text-amber-900">
                Lưu ý quan trọng về chuyển đổi vai trò Buyer → Seller
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-amber-900/90">
                <li>
                  <strong>Trong lúc chờ duyệt và trước khi kích hoạt:</strong> Tài khoản của bạn vẫn
                  là <strong>Buyer</strong> và tiếp tục mua hàng, đấu giá bình thường.
                </li>
                <li>
                  <strong>Sau khi hồ sơ được duyệt (APPROVED):</strong> Bạn sẽ chủ động kiểm tra
                  điều kiện nghĩa vụ và bấm xác nhận kích hoạt Seller.
                </li>
                <li>
                  <strong>Sau khi kích hoạt thành Seller:</strong> Theo quy định phân quyền MVP, tài
                  khoản Seller sẽ dùng để đăng bán sản phẩm/đấu giá và{' '}
                  <strong>
                    không còn quyền giỏ hàng, thanh toán mua hàng hoặc đặt giá đấu giá
                  </strong>
                  . Bạn vẫn xem được sản phẩm trên sàn và lịch sử các đơn đã mua trước đây của mình.
                </li>
                <li>Không hỗ trợ tự chuyển ngược từ Seller về Buyer trong phạm vi MVP.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Error Summary */}
      {hasErrors ? (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold">
                {serverErrorMessage ||
                  'Vui lòng kiểm tra và hoàn thiện các trường thông tin bên dưới:'}
              </p>
              {Object.keys(fieldErrors).length > 0 ? (
                <ul className="list-disc space-y-0.5 pl-4 text-xs">
                  {Object.entries(fieldErrors).map(([key, msg]) => (
                    <li key={key}>{msg}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Section 1: Thông tin cửa hàng & liên hệ */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <UserCheck className="size-4 text-brand-dark" aria-hidden="true" />
          <span>1. Thông tin gian hàng &amp; người liên hệ</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor={`${formId}-shopName`} className="block text-sm font-medium text-ink">
              Tên cửa hàng <span className="text-red-600">*</span>
            </label>
            <Input
              id={`${formId}-shopName`}
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                if (fieldErrors.shopName) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.shopName;
                    return next;
                  });
                }
              }}
              maxLength={80}
              placeholder="Ví dụ: Nexus Vintage Audio & Collectibles"
              aria-invalid={Boolean(fieldErrors.shopName)}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between text-xs">
              {fieldErrors.shopName ? (
                <span className="font-medium text-red-600">{fieldErrors.shopName}</span>
              ) : (
                <span className="text-muted">
                  Từ 3 đến 80 ký tự. Tên hiển thị công khai trên gian hàng của bạn.
                </span>
              )}
              <span className="text-muted">{shopName.trim().length}/80</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`${formId}-contactName`} className="block text-sm font-medium text-ink">
              Tên người liên hệ <span className="text-red-600">*</span>
            </label>
            <Input
              id={`${formId}-contactName`}
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                if (fieldErrors.contactName) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.contactName;
                    return next;
                  });
                }
              }}
              maxLength={100}
              placeholder="Họ và tên người phụ trách gian hàng"
              aria-invalid={Boolean(fieldErrors.contactName)}
              disabled={isSubmitting}
            />
            {fieldErrors.contactName ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.contactName}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`${formId}-contactPhone`}
              className="block text-sm font-medium text-ink"
            >
              Điện thoại liên hệ <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <Input
                id={`${formId}-contactPhone`}
                type="tel"
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value);
                  if (fieldErrors.contactPhone) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.contactPhone;
                      return next;
                    });
                  }
                }}
                placeholder="0901234567"
                aria-invalid={Boolean(fieldErrors.contactPhone)}
                disabled={isSubmitting}
              />
              <Phone
                className="pointer-events-none absolute right-3.5 top-3.5 size-4 text-muted"
                aria-hidden="true"
              />
            </div>
            {fieldErrors.contactPhone ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.contactPhone}</p>
            ) : (
              <p className="text-xs text-muted">Số điện thoại 10 chữ số bắt đầu bằng 0 hoặc +84.</p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={`${formId}-contactEmail`}
                className="block text-sm font-medium text-ink"
              >
                Email liên hệ (từ tài khoản đăng nhập)
              </label>
              <Badge variant={emailVerified ? 'success' : 'outline'}>
                <CheckCircle2 className="size-3" aria-hidden="true" />
                {emailVerified ? 'Email tài khoản đã xác thực' : 'Email tài khoản'}
              </Badge>
            </div>
            <Input
              id={`${formId}-contactEmail`}
              type="email"
              value={accountEmail}
              readOnly
              disabled
              className="bg-canvas text-muted"
            />
            <p className="text-xs text-muted">
              Thông báo kết quả xét duyệt sẽ được gửi tới địa chỉ email này.
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Địa chỉ lấy hàng */}
      <div className="space-y-4 border-t border-line pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <MapPin className="size-4 text-brand-dark" aria-hidden="true" />
            <span>2. Địa chỉ lấy hàng của cửa hàng</span>
          </div>
          <span className="text-xs text-muted">Độc lập với sổ địa chỉ nhận hàng Buyer của bạn</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label id={`${formId}-province-label`} className="block text-sm font-medium text-ink">
              Tỉnh / Thành phố <span className="text-red-600">*</span>
            </label>
            <Select
              value={currentProvince?.code ?? ''}
              onValueChange={handleProvinceChange}
              disabled={isSubmitting}
            >
              <SelectTrigger aria-labelledby={`${formId}-province-label`}>
                <SelectValue placeholder="Chọn Tỉnh/Thành phố" />
              </SelectTrigger>
              <SelectContent>
                {provinces.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.provinceCode ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.provinceCode}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label id={`${formId}-ward-label`} className="block text-sm font-medium text-ink">
              Phường / Xã <span className="text-red-600">*</span>
            </label>
            <Select
              value={currentWard?.code ?? ''}
              onValueChange={(value) => {
                setWardCode(value);
                if (fieldErrors.wardCode) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.wardCode;
                    return next;
                  });
                }
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger aria-labelledby={`${formId}-ward-label`}>
                <SelectValue placeholder="Chọn Phường/Xã" />
              </SelectTrigger>
              <SelectContent>
                {currentWards.map((item) => (
                  <SelectItem key={item.code} value={item.code}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.wardCode ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.wardCode}</p>
            ) : null}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor={`${formId}-street`} className="block text-sm font-medium text-ink">
              Số nhà, tên đường / địa chỉ cụ thể <span className="text-red-600">*</span>
            </label>
            <Input
              id={`${formId}-street`}
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                if (fieldErrors.street) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.street;
                    return next;
                  });
                }
              }}
              maxLength={180}
              placeholder="Ví dụ: Số 45 Đường Nguyễn Huệ, Tòa nhà thương mại tầng 2"
              aria-invalid={Boolean(fieldErrors.street)}
              disabled={isSubmitting}
            />
            {fieldErrors.street ? (
              <p className="text-xs font-medium text-red-600">{fieldErrors.street}</p>
            ) : (
              <p className="text-xs text-muted">
                Địa chỉ này chỉ dùng cho hoạt động lấy hàng của gian hàng Seller, không làm thay đổi
                địa chỉ giao hàng của các đơn mua Buyer cũ.
              </p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor={`${formId}-note`} className="block text-sm font-medium text-ink">
              Ghi chú điểm lấy hàng (không bắt buộc)
            </label>
            <Input
              id={`${formId}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={180}
              placeholder="Ví dụ: Liên hệ trước 15 phút khi bưu tá tới lấy hàng"
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      {/* Section 3: Nhóm hàng dự kiến bán & Giới thiệu */}
      <div className="space-y-4 border-t border-line pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <Tags className="size-4 text-brand-dark" aria-hidden="true" />
            <span>
              3. Nhóm ngành hàng dự kiến kinh doanh <span className="text-red-600">*</span>
            </span>
          </div>
          <span className="text-xs text-muted">Đã chọn {selectedCategoryIds.length} danh mục</span>
        </div>

        <p className="text-xs text-muted">
          Chọn một hoặc nhiều danh mục hiện có trên sàn Nexus (Người bán không tự tạo danh mục mới):
        </p>

        {loadingCategories ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-11 animate-pulse rounded-xl border border-line bg-canvas" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const checked = selectedCategoryIds.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                    checked
                      ? 'border-brand-dark bg-brand-soft/60 font-semibold text-brand-dark'
                      : 'border-line bg-white text-ink hover:border-brand-dark/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCategory(cat.id)}
                    disabled={isSubmitting}
                    className="size-4 rounded border-line accent-brand-dark"
                  />
                  <span className="line-clamp-1">{cat.name}</span>
                </label>
              );
            })}
          </div>
        )}

        {fieldErrors.categoryIds ? (
          <p className="text-xs font-medium text-red-600">{fieldErrors.categoryIds}</p>
        ) : null}

        <div className="space-y-1.5 pt-2">
          <label
            htmlFor={`${formId}-shopDescription`}
            className="block text-sm font-medium text-ink"
          >
            Giới thiệu cửa hàng (không bắt buộc)
          </label>
          <Textarea
            id={`${formId}-shopDescription`}
            value={shopDescription}
            onChange={(e) => {
              setShopDescription(e.target.value);
              if (fieldErrors.shopDescription) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.shopDescription;
                  return next;
                });
              }
            }}
            maxLength={1000}
            placeholder="Mô tả ngắn gọn về nguồn hàng, dòng sản phẩm chủ đạo và cam kết chất lượng của cửa hàng..."
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Tối đa 1000 ký tự.</span>
            <span>{shopDescription.trim().length}/1000</span>
          </div>
          {fieldErrors.shopDescription ? (
            <p className="text-xs font-medium text-red-600">{fieldErrors.shopDescription}</p>
          ) : null}
        </div>
      </div>

      {/* Section 4: Điều khoản chuyển đổi */}
      <div className="space-y-3 border-t border-line pt-5">
        <label
          htmlFor={`${formId}-acceptedTerms`}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm transition-colors ${
            fieldErrors.acceptedTerms
              ? 'border-red-300 bg-red-50/50'
              : acceptedTerms
                ? 'border-brand-dark/50 bg-brand-soft/30'
                : 'border-line bg-canvas/50'
          }`}
        >
          <input
            id={`${formId}-acceptedTerms`}
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (fieldErrors.acceptedTerms) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.acceptedTerms;
                  return next;
                });
              }
            }}
            disabled={isSubmitting}
            className="mt-1 size-4 shrink-0 rounded border-line accent-brand-dark"
          />
          <div className="space-y-1">
            <span className="font-semibold text-ink">
              Tôi đã đọc và đồng ý với điều kiện đăng ký &amp; chuyển đổi vai trò Seller{' '}
              <span className="text-red-600">*</span>
            </span>
            <p className="text-xs leading-relaxed text-muted">
              Tôi hiểu rằng việc gửi hồ sơ chưa làm thay đổi vai trò ngay. Sau khi Quản trị viên phê
              duyệt và tôi xác nhận kích hoạt Seller, tài khoản sẽ chuyển sang vai trò{' '}
              <strong>SELLER</strong> (dừng quyền mua hàng qua giỏ hàng, thanh toán checkout và trả
              giá đấu giá theo quy định MVP, nhưng vẫn xem được lịch sử các đơn mua trước đó).
            </p>
          </div>
        </label>
        {fieldErrors.acceptedTerms ? (
          <p className="text-xs font-medium text-red-600">{fieldErrors.acceptedTerms}</p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Info className="size-4 shrink-0" aria-hidden="true" />
          <span>Hồ sơ sẽ được lưu phiên bản và chuyển tới hàng chờ xét duyệt của Admin.</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onCancelEdit ? (
            <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isSubmitting}>
              Hủy chỉnh sửa
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Đang gửi hồ sơ...'
              : mode === 'resubmit'
                ? 'Gửi lại hồ sơ xét duyệt'
                : 'Gửi hồ sơ đăng ký bán hàng'}
          </Button>
        </div>
      </div>
    </form>
  );
}
