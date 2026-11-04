'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { provinceByCode, provinceCodeForName, provinces, wardCodeForName } from '../data/locations';
import type { AddressInput, ShippingAddress } from '../utils/address-book';

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
  onSave: (input: AddressInput, makeDefault: boolean) => void;
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
  const selectedProvince = provinceByCode(value.provinceCode || '');

  function submit(event: FormEvent) {
    event.preventDefault();
    const input = Object.fromEntries(
      Object.entries(value).map(([key, text]) => [key, text.trim()]),
    ) as AddressInput;
    if (!input.recipientName || !input.phone || !input.street) {
      setError('Vui lòng điền người nhận, số điện thoại và địa chỉ cụ thể.');
      return;
    }
    const province = provinceByCode(input.provinceCode || '');
    const ward = province?.wards.find((item) => item.code === input.wardCode);
    if (!province || !ward) {
      setError('Vui lòng chọn tỉnh/thành và phường/xã trong danh sách.');
      return;
    }
    input.province = province.name;
    input.ward = ward.name;
    if (!/^(?:0|\+84)\d{9}$/.test(input.phone.replace(/[\s.-]/g, ''))) {
      setError('Số điện thoại Việt Nam cần có 10 chữ số hoặc bắt đầu bằng +84.');
      return;
    }
    setError('');
    onSave(input, makeDefault);
  }

  const fields: { key: keyof AddressInput; label: string; required?: boolean }[] = [
    { key: 'recipientName', label: 'Tên người nhận', required: true },
    { key: 'phone', label: 'Số điện thoại người nhận', required: true },
  ];

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="address-label" className="mb-1.5 block text-sm font-semibold">
          Nhãn địa chỉ
        </label>
        <select
          id="address-label"
          value={value.label}
          onChange={(event) => setValue({ ...value, label: event.target.value })}
          className="min-h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
        >
          <option value="Nhà riêng">Nhà riêng</option>
          <option value="Văn phòng">Văn phòng</option>
          <option value="Khác">Khác</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, required }) => (
          <div key={key}>
            <label htmlFor={`address-${key}`} className="mb-1.5 block text-sm font-semibold">
              {label}
              {required ? ' *' : ''}
            </label>
            <Input
              id={`address-${key}`}
              value={value[key]}
              onChange={(event) => setValue({ ...value, [key]: event.target.value })}
              autoComplete={key === 'recipientName' ? 'name' : 'tel'}
              inputMode={key === 'phone' ? 'tel' : undefined}
              maxLength={120}
              aria-required={required || undefined}
            />
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="address-province" className="mb-1.5 block text-sm font-semibold">
            Tỉnh / thành phố *
          </label>
          <Select
            value={value.provinceCode || undefined}
            onValueChange={(code) => {
              const province = provinceByCode(code);
              setValue((current) => ({
                ...current,
                provinceCode: code,
                province: province?.name || '',
                wardCode: '',
                ward: '',
              }));
              setError('');
            }}
          >
            <SelectTrigger
              id="address-province"
              className="min-h-11 w-full rounded-xl border-line bg-white"
            >
              <SelectValue placeholder="Chọn tỉnh / thành" />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white text-ink">
              {provinces.map((province) => (
                <SelectItem key={province.code} value={province.code}>
                  {province.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="address-ward" className="mb-1.5 block text-sm font-semibold">
            Phường / xã *
          </label>
          <Select
            value={value.wardCode || undefined}
            onValueChange={(code) => {
              const ward = selectedProvince?.wards.find((item) => item.code === code);
              setValue((current) => ({ ...current, wardCode: code, ward: ward?.name || '' }));
              setError('');
            }}
            disabled={!selectedProvince}
          >
            <SelectTrigger
              id="address-ward"
              className="min-h-11 w-full rounded-xl border-line bg-white"
            >
              <SelectValue
                placeholder={selectedProvince ? 'Chọn phường / xã' : 'Chọn tỉnh / thành trước'}
              />
            </SelectTrigger>
            <SelectContent className="max-h-72 bg-white text-ink">
              {selectedProvince?.wards.map((ward) => (
                <SelectItem key={ward.code} value={ward.code}>
                  {ward.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label htmlFor="address-street" className="mb-1.5 block text-sm font-semibold">
          Số nhà, tên đường, địa chỉ cụ thể *
        </label>
        <Input
          id="address-street"
          value={value.street}
          onChange={(event) => setValue({ ...value, street: event.target.value })}
          autoComplete="street-address"
          maxLength={120}
          aria-required
        />
      </div>
      <div>
        <label htmlFor="address-note" className="mb-1.5 block text-sm font-semibold">
          Ghi chú cho người giao hàng
        </label>
        <Input
          id="address-note"
          value={value.note}
          onChange={(event) => setValue({ ...value, note: event.target.value })}
          maxLength={180}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={makeDefault}
          onChange={(event) => setMakeDefault(event.target.checked)}
          className="size-4 accent-brand"
        />
        Đặt làm địa chỉ mặc định
      </label>
      {error && (
        <p role="alert" className="text-sm text-brand-dark">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit">{initial ? 'Lưu thay đổi' : 'Lưu địa chỉ'}</Button>
      </div>
    </form>
  );
}
