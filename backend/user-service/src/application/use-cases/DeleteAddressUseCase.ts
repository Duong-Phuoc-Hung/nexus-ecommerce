import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { AddressNotFoundException, AddressForbiddenException } from './UpdateAddressUseCase';

export class DeleteAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  public async execute(
    userId: string,
    addressId: string,
  ): Promise<{ success: boolean; message: string }> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      throw new AddressNotFoundException(addressId);
    }

    if (address.userId !== userId) {
      throw new AddressForbiddenException();
    }

    const wasDefault = address.isDefault;

    // 1. Xóa địa chỉ
    await this.addressRepository.delete(addressId);

    // 2. Nếu xóa địa chỉ mặc định, tự động chuyển mặc định cho địa chỉ còn lại tạo sớm nhất (D.6 & P0 #6)
    if (wasDefault) {
      const remaining = await this.addressRepository.findByUserId(userId);
      if (remaining.length > 0) {
        // Sắp xếp tăng dần theo createdAt (cũ nhất trước)
        const sorted = remaining.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const nextDefault = sorted[0];
        await this.addressRepository.setDefault(userId, nextDefault.id);
      }
    }

    return {
      success: true,
      message: 'Địa chỉ đã được xóa thành công.',
    };
  }
}
