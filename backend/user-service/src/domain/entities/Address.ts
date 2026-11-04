export interface AddressProps {
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: Address
 * Đại diện cho một địa chỉ nhận hàng trong sổ địa chỉ của Buyer (SRS 3.1 & P0 #3-7).
 * Tuân thủ mô hình 2 cấp: Tỉnh/Thành phố -> Phường/Xã (bỏ cấp Quận/Huyện).
 */
export class Address {
  private readonly _id: string;
  private readonly _userId: string;
  private _label?: string;
  private _recipientName: string;
  private _phone: string;
  private _provinceCode: string;
  private _provinceName: string;
  private _wardCode: string;
  private _wardName: string;
  private _street: string;
  private _note?: string;
  private _isDefault: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AddressProps) {
    this._id = props.id;
    this._userId = props.userId;
    this._label = props.label;
    this._recipientName = props.recipientName;
    this._phone = props.phone;
    this._provinceCode = props.provinceCode;
    this._provinceName = props.provinceName;
    this._wardCode = props.wardCode;
    this._wardName = props.wardName;
    this._street = props.street;
    this._note = props.note;
    this._isDefault = props.isDefault;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get userId(): string {
    return this._userId;
  }

  public get label(): string | undefined {
    return this._label;
  }

  public get recipientName(): string {
    return this._recipientName;
  }

  public get phone(): string {
    return this._phone;
  }

  public get provinceCode(): string {
    return this._provinceCode;
  }

  public get provinceName(): string {
    return this._provinceName;
  }

  public get wardCode(): string {
    return this._wardCode;
  }

  public get wardName(): string {
    return this._wardName;
  }

  public get street(): string {
    return this._street;
  }

  public get note(): string | undefined {
    return this._note;
  }

  public get isDefault(): boolean {
    return this._isDefault;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public setDefault(isDefault: boolean): void {
    this._isDefault = isDefault;
    this._updatedAt = new Date();
  }

  public update(props: {
    label?: string;
    recipientName?: string;
    phone?: string;
    provinceCode?: string;
    provinceName?: string;
    wardCode?: string;
    wardName?: string;
    street?: string;
    note?: string;
  }): void {
    if (props.label !== undefined) this._label = props.label;
    if (props.recipientName !== undefined) this._recipientName = props.recipientName;
    if (props.phone !== undefined) this._phone = props.phone;
    if (props.provinceCode !== undefined) this._provinceCode = props.provinceCode;
    if (props.provinceName !== undefined) this._provinceName = props.provinceName;
    if (props.wardCode !== undefined) this._wardCode = props.wardCode;
    if (props.wardName !== undefined) this._wardName = props.wardName;
    if (props.street !== undefined) this._street = props.street;
    if (props.note !== undefined) this._note = props.note;
    this._updatedAt = new Date();
  }

  public toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      label: this._label,
      recipientName: this._recipientName,
      phone: this._phone,
      provinceCode: this._provinceCode,
      provinceName: this._provinceName,
      wardCode: this._wardCode,
      wardName: this._wardName,
      street: this._street,
      note: this._note,
      isDefault: this._isDefault,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
