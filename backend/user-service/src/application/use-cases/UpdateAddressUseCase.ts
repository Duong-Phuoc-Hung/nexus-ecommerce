import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { UpdateAddressDto, AddressResponseDto } from '../dtos/AddressDto';

export class AddressNotFoundException extends Error {
  constructor(id: string) {
    super(`Không tìm thấy địa chỉ với ID "${id}".`);
    this.name = 'AddressNotFoundException';
  }
}

export class AddressForbiddenException extends Error {
  constructor(message: string = 'Bạn không có quyền thao tác trên địa chỉ này.') {
    super(message);
    this.name = 'AddressForbiddenException';
  }
}

export class UpdateAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  public async execute(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      throw new AddressNotFoundException(addressId);
    }

    if (address.userId !== userId) {
      throw new AddressForbiddenException();
    }

    let normalizedPhone: string | undefined = undefined;
    if (dto.phone !== undefined) {
      const trimmedPhone = dto.phone.trim();
      const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!vnPhoneRegex.test(trimmedPhone)) {
        throw new Error('Số điện thoại người nhận không đúng định dạng Việt Nam.');
      }
      normalizedPhone = trimmedPhone.startsWith('+84') ? '0' + trimmedPhone.slice(3) : trimmedPhone;
    }

    address.update({
      label: dto.label !== undefined ? dto.label.trim() : undefined,
      recipientName: dto.recipientName !== undefined ? dto.recipientName.trim() : undefined,
      phone: normalizedPhone,
      provinceCode: dto.provinceCode !== undefined ? String(dto.provinceCode).trim() : undefined,
      provinceName: dto.provinceName !== undefined ? dto.provinceName.trim() : undefined,
      wardCode: dto.wardCode !== undefined ? String(dto.wardCode).trim() : undefined,
      wardName: dto.wardName !== undefined ? dto.wardName.trim() : undefined,
      street: dto.street !== undefined ? dto.street.trim() : undefined,
      note: dto.note !== undefined ? dto.note.trim() : undefined,
    });

    await this.addressRepository.update(address);
    return address.toJSON();
  }
}
