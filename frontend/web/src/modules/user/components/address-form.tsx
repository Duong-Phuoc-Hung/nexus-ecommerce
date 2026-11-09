'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, MapPin, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { provinceByCode, provinceCodeForName, provinces, wardCodeForName } from '../data/locations';
import type { AddressInput, ShippingAddress } from '../utils/address-book';

/** Bỏ dấu tiếng Việt để tìm kiếm gợi ý linh hoạt, gõ không dấu vẫn ra đúng kết quả */
function normalizeVi(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

interface AutocompleteItem {
  code: string;
  name: string;
}

interface AddressAutocompleteProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  items: AutocompleteItem[];
  disabled?: boolean;
  error?: string;
  onSelect: (item: AutocompleteItem) => void;
  onInputChange: (rawText: string) => void;
}

function AddressAutocomplete({
  id,
  label,
  required,
  value,
  placeholder,
  items,
  disabled = false,
  error = '',
  onSelect,
  onInputChange,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lọc danh sách gợi ý theo nội dung người dùng đang gõ
  const filtered = useMemo(() => {
    if (!value.trim()) return items.slice(0, 40);
    const q = normalizeVi(value);
    return items
      .filter((it) => normalizeVi(it.name).includes(q) || it.code.toLowerCase().includes(q))
      .slice(0, 40);
  }, [items, value]);

  // Đóng danh sách gợi ý khi bấm ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-stone-900">
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            onInputChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          placeholder={placeholder}
          aria-required={required || undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="pr-9"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen((prev) => !prev);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 disabled:opacity-40"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}

      {/* Danh sách gợi ý thả xuống */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg ring-1 ring-black/5">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const isSelected = item.name.toLowerCase() === value.trim().toLowerCase();
              return (
                <button
                  key={item.code}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // tránh blur input trước khi chọn
                    onSelect(item);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition ${
                    isSelected
                      ? 'bg-brand-soft/70 font-semibold text-brand-dark'
                      : 'text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  {isSelected && <Check className="size-3.5 shrink-0 text-brand-dark ml-2" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2.5 text-center text-xs text-muted">
              <span>Không tìm thấy gợi ý phù hợp cho &quot;{value}&quot;</span>
              <p className="mt-0.5 text-[11px] text-stone-400">
                Bạn vẫn có thể tiếp tục gõ địa chỉ
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AddressForm({
  initial,
  fullName,
  phone,
  onSave,
  onCancel,
}: {
  initial?: ShippingAddress | null;
  fullName: string;
  phone: string;
  onSave: (input: AddressInput, makeDefault: boolean) => void | Promise<void>;
  onCancel: () => void;
}) {
  const initialProvinceCode = initial?.provinceCode || provinceCodeForName(initial?.province || '');
  const [value, setValue] = useState<AddressInput>({
    label: initial?.label || 'Nhà riêng',
    recipientName: initial?.recipientName || fullName,
    phone: initial?.phone || phone,
    provinceCode: initialProvinceCode,
    province: initial?.province || '',
    wardCode: initial?.wardCode || wardCodeForName(initialProvinceCode, initial?.ward || ''),
    ward: initial?.ward || '',
    street: initial?.street || '',
    note: initial?.note || '',
  });
  const [makeDefault, setMakeDefault] = useState(Boolean(initial?.isDefault));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [invalidField, setInvalidField] = useState('');

  const selectedProvince = provinceByCode(value.provinceCode || '');
  const provinceList: AutocompleteItem[] = useMemo(
    () => provinces.map((p) => ({ code: p.code, name: p.name })),
    [],
  );
  const wardList: AutocompleteItem[] = useMemo(
    () => (selectedProvince?.wards || []).map((w) => ({ code: w.code, name: w.name })),
    [selectedProvince],
  );

  const fieldError = (field: string) => (invalidField === field ? error : '');

  // Tự động tìm kiếm tỉnh/phường khi người dùng gõ trực tiếp mà không bấm vào gợi ý
  const findBestProvinceMatch = (name: string) => {
    const q = normalizeVi(name);
    return provinces.find(
      (p) => normalizeVi(p.name) === q || p.name.toLowerCase() === name.trim().toLowerCase(),
    );
  };

  const findBestWardMatch = (province: typeof selectedProvince, name: string) => {
    if (!province) return null;
    const q = normalizeVi(name);
    return province.wards.find(
      (w) => normalizeVi(w.name) === q || w.name.toLowerCase() === name.trim().toLowerCase(),
    );
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    const input = Object.fromEntries(
      Object.entries(value).map(([key, text]) => [key, String(text ?? '').trim()]),
    ) as AddressInput;

    // 1. Kiểm tra Họ tên người nhận
    if (
      !input.recipientName ||
      input.recipientName.length < 2 ||
      input.recipientName.length > 120
    ) {
      setInvalidField('recipientName');
      setError('Tên người nhận phải có từ 2 đến 120 ký tự.');
      return;
    }

    // 2. Kiểm tra Số điện thoại
    if (input.phone.startsWith('-') || input.phone.includes('-')) {
      setInvalidField('phone');
      setError('Số điện thoại không được là số âm hoặc chứa dấu trừ (-).');
      return;
    }
    if (/[^\d+\s.]/.test(input.phone)) {
      setInvalidField('phone');
      setError('Số điện thoại chỉ được chứa chữ số (0–9) hoặc mã vùng +84.');
      return;
    }
    const normalizedPhone = input.phone.replace(/[\s.]/g, '');
    if (!/^(?:0|\+84)[35789]\d{8}$/.test(normalizedPhone)) {
      setInvalidField('phone');
      setError('Số điện thoại Việt Nam cần đúng 10 chữ số di động (03, 05, 07, 08, 09) hoặc +84.');
      return;
    }
    input.phone = normalizedPhone;

    // 3. Kiểm tra Tỉnh / thành phố
    let matchedProvince = provinceByCode(input.provinceCode || '');
    if (!matchedProvince && input.province) {
      matchedProvince = findBestProvinceMatch(input.province);
      if (matchedProvince) {
        input.provinceCode = matchedProvince.code;
        input.province = matchedProvince.name;
      }
    }
    if (!matchedProvince) {
      setInvalidField('province');
      setError('Vui lòng chọn hoặc nhập tỉnh/thành phố hợp lệ.');
      return;
    }

    // 4. Kiểm tra Phường / xã
    let matchedWard = matchedProvince.wards.find((item) => item.code === input.wardCode);
    if (!matchedWard && input.ward) {
      matchedWard = findBestWardMatch(matchedProvince, input.ward) || undefined;
      if (matchedWard) {
        input.wardCode = matchedWard.code;
        input.ward = matchedWard.name;
      }
    }
    if (!matchedWard) {
      setInvalidField('ward');
      setError('Vui lòng chọn hoặc nhập phường/xã hợp lệ thuộc ' + matchedProvince.name + '.');
      return;
    }

    // 5. Kiểm tra Số nhà, tên đường
    if (!input.street || input.street.length < 3 || input.street.length > 120) {
      setInvalidField('street');
      setError('Địa chỉ cụ thể (số nhà, tên đường) cần từ 3 đến 120 ký tự.');
      return;
    }

    setInvalidField('');
    setError('');
    setSaving(true);
    Promise.resolve(onSave(input, makeDefault)).finally(() => setSaving(false));
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="address-label"
          className="mb-1.5 block text-sm font-semibold text-stone-900"
        >
          Nhãn địa chỉ
        </label>
        <select
          id="address-label"
          value={value.label}
          onChange={(event) => setValue({ ...value, label: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm focus:border-brand focus:outline-none"
        >
          <option value="Nhà riêng">Nhà riêng</option>
          <option value="Văn phòng">Văn phòng</option>
          <option value="Khác">Khác</option>
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Tên người nhận */}
        <div>
          <label
            htmlFor="address-recipientName"
            className="mb-1.5 block text-sm font-semibold text-stone-900"
          >
            Tên người nhận *
          </label>
          <Input
            id="address-recipientName"
            value={value.recipientName}
            onChange={(event) => {
              setValue({ ...value, recipientName: event.target.value });
              if (invalidField === 'recipientName') setError('');
            }}
            autoComplete="name"
            maxLength={120}
            aria-required
            aria-invalid={invalidField === 'recipientName'}
            aria-describedby={
              fieldError('recipientName') ? 'address-recipientName-error' : undefined
            }
          />
          {fieldError('recipientName') && (
            <p id="address-recipientName-error" role="alert" className="mt-1 text-xs text-red-700">
              {fieldError('recipientName')}
            </p>
          )}
        </div>

        {/* Số điện thoại */}
        <div>
          <label
            htmlFor="address-phone"
            className="mb-1.5 block text-sm font-semibold text-stone-900"
          >
            Số điện thoại người nhận *
          </label>
          <Input
            id="address-phone"
            value={value.phone}
            onChange={(event) => {
              const raw = event.target.value;
              setValue({ ...value, phone: raw });
              if (raw.trim().startsWith('-') || raw.includes('-')) {
                setInvalidField('phone');
                setError('Số điện thoại không được là số âm hoặc chứa dấu trừ (-).');
              } else if (/[^\d+\s.]/.test(raw.trim())) {
                setInvalidField('phone');
                setError('Số điện thoại chỉ được chứa chữ số (0–9) hoặc mã vùng +84.');
              } else if (invalidField === 'phone') {
                setError('');
              }
            }}
            autoComplete="tel"
            inputMode="tel"
            maxLength={15}
            aria-required
            aria-invalid={invalidField === 'phone'}
            aria-describedby={fieldError('phone') ? 'address-phone-error' : undefined}
          />
          {fieldError('phone') && (
            <p id="address-phone-error" role="alert" className="mt-1 text-xs text-red-700">
              {fieldError('phone')}
            </p>
          )}
        </div>
      </div>

      {/* Tỉnh / thành & Phường / xã: Vừa nhập vừa hiện gợi ý autocomplete */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AddressAutocomplete
          id="address-province"
          label="Tỉnh / thành phố"
          required
          value={value.province}
          placeholder="Nhập hoặc chọn tỉnh / thành…"
          items={provinceList}
          error={fieldError('province')}
          onInputChange={(text) => {
            const matched = findBestProvinceMatch(text);
            setValue((curr) => ({
              ...curr,
              province: text,
              provinceCode: matched?.code || '',
              wardCode: curr.provinceCode === matched?.code ? curr.wardCode : '',
              ward: curr.provinceCode === matched?.code ? curr.ward : '',
            }));
            if (invalidField === 'province') setError('');
          }}
          onSelect={(item) => {
            setValue((curr) => ({
              ...curr,
              province: item.name,
              provinceCode: item.code,
              wardCode: '',
              ward: '',
            }));
            if (invalidField === 'province') setError('');
          }}
        />

        <AddressAutocomplete
          id="address-ward"
          label="Phường / xã"
          required
          value={value.ward}
          disabled={!selectedProvince}
          placeholder={selectedProvince ? 'Nhập hoặc chọn phường / xã…' : 'Chọn tỉnh / thành trước'}
          items={wardList}
          error={fieldError('ward')}
          onInputChange={(text) => {
            const matched = findBestWardMatch(selectedProvince, text);
            setValue((curr) => ({
              ...curr,
              ward: text,
              wardCode: matched?.code || '',
            }));
            if (invalidField === 'ward') setError('');
          }}
          onSelect={(item) => {
            setValue((curr) => ({
              ...curr,
              ward: item.name,
              wardCode: item.code,
            }));
            if (invalidField === 'ward') setError('');
          }}
        />
      </div>

      {/* Số nhà, tên đường cụ thể */}
      <div>
        <label
          htmlFor="address-street"
          className="mb-1.5 block text-sm font-semibold text-stone-900"
        >
          Số nhà, tên đường, địa chỉ cụ thể *
        </label>
        <Input
          id="address-street"
          value={value.street}
          onChange={(event) => {
            setValue({ ...value, street: event.target.value });
            if (invalidField === 'street') setError('');
          }}
          placeholder="Ví dụ: 123 Đường Nguyễn Huệ, Tòa nhà A, Căn hộ 402…"
          autoComplete="street-address"
          maxLength={120}
          aria-required
          aria-invalid={invalidField === 'street'}
          aria-describedby={fieldError('street') ? 'address-street-error' : undefined}
        />
        {fieldError('street') && (
          <p id="address-street-error" role="alert" className="mt-1 text-xs text-red-700">
            {fieldError('street')}
          </p>
        )}
      </div>

      {/* Ghi chú giao hàng */}
      <div>
        <label htmlFor="address-note" className="mb-1.5 block text-sm font-semibold text-stone-900">
          Ghi chú cho người giao hàng
        </label>
        <Input
          id="address-note"
          value={value.note}
          onChange={(event) => setValue({ ...value, note: event.target.value })}
          placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi đến…"
          maxLength={180}
        />
      </div>

      <label className="flex min-h-10 items-center gap-2 text-sm text-stone-800 cursor-pointer">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(event) => setMakeDefault(event.target.checked)}
          className="size-4 rounded accent-brand"
        />
        <span>Đặt làm địa chỉ nhận hàng mặc định</span>
      </label>

      {error && !invalidField && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-line/60">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Hủy
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Đang lưu…' : initial ? 'Lưu thay đổi' : 'Lưu địa chỉ'}
        </Button>
      </div>
    </form>
  );
}
