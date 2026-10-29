export interface CreateAddressDto {
  label?: string;
  recipientName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  street: string;
  note?: string;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  label?: string;
  recipientName?: string;
  phone?: string;
  provinceCode?: string;
  provinceName?: string;
  wardCode?: string;
  wardName?: string;
  street?: string;
  note?: string;
}

export interface AddressResponseDto {
  id: string;
  userId: string;
  label?: string;
  recipientName: string;
  phone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  street: string;
  note?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
