import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { Address } from '../../domain/entities/Address';
import { CreateAddressDto, AddressResponseDto } from '../dtos/AddressDto';

export class AddressLimitReachedException extends Error {
  constructor(message: string = 'Mỗi khách hàng chỉ được lưu tối đa 5 địa chỉ nhận hàng.') {
    super(message);
    this.name = 'AddressLimitReachedException';
  }
}

export class CreateAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  public async execute(userId: string, dto: CreateAddressDto): Promise<AddressResponseDto> {
    if (!userId || !userId.trim()) {
      throw new Error('User ID không hợp lệ.');
    }

    // 1. Kiểm tra giới hạn 5 địa chỉ (P0 #4 & D.6)
    const currentCount = await this.addressRepository.countByUserId(userId);
    if (currentCount >= 5) {
      throw new AddressLimitReachedException(
        'ADDRESS_LIMIT_REACHED: Mỗi khách hàng chỉ được lưu tối đa 5 địa chỉ đang hoạt động.',
      );
    }

    // 2. Validate các trường bắt buộc
    if (!dto.recipientName || !dto.recipientName.trim()) {
      throw new Error('Tên người nhận không được để trống.');
    }
    if (dto.recipientName.trim().length > 100) {
      throw new Error('Tên người nhận tối đa 100 ký tự.');
    }

    if (!dto.phone || !dto.phone.trim()) {
      throw new Error('Số điện thoại người nhận không được để trống.');
    }
    const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    const trimmedPhone = dto.phone.trim();
    if (!vnPhoneRegex.test(trimmedPhone)) {
      throw new Error('Số điện thoại người nhận không đúng định dạng Việt Nam.');
    }
    const normalizedPhone = trimmedPhone.startsWith('+84')
      ? '0' + trimmedPhone.slice(3)
      : trimmedPhone;

    if (!dto.provinceCode || !String(dto.provinceCode).trim()) {
      throw new Error('Mã tỉnh/thành phố là bắt buộc.');
    }
    if (!dto.provinceName || !dto.provinceName.trim()) {
      throw new Error('Tên tỉnh/thành phố là bắt buộc.');
    }

    if (!dto.wardCode || !String(dto.wardCode).trim()) {
      throw new Error('Mã phường/xã là bắt buộc.');
    }
    if (!dto.wardName || !dto.wardName.trim()) {
      throw new Error('Tên phường/xã là bắt buộc.');
    }

    if (!dto.street || !dto.street.trim()) {
      throw new Error('Địa chỉ cụ thể (số nhà, đường) không được để trống.');
    }

    // 3. Quy tắc mặc định: Địa chỉ đầu tiên tự động thành mặc định
    const shouldBeDefault = currentCount === 0 || Boolean(dto.isDefault);

    const now = new Date();
    const addressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newAddress = new Address({
      id: addressId,
      userId: userId.trim(),
      label: dto.label ? dto.label.trim() : undefined,
      recipientName: dto.recipientName.trim(),
      phone: normalizedPhone,
      provinceCode: String(dto.provinceCode).trim(),
      provinceName: dto.provinceName.trim(),
      wardCode: String(dto.wardCode).trim(),
      wardName: dto.wardName.trim(),
      street: dto.street.trim(),
      note: dto.note ? dto.note.trim() : undefined,
      isDefault: shouldBeDefault,
      createdAt: now,
      updatedAt: now,
    });

    await this.addressRepository.save(newAddress);

    if (shouldBeDefault && currentCount > 0) {
      await this.addressRepository.setDefault(userId, newAddress.id);
    }

    return newAddress.toJSON();
  }
}
