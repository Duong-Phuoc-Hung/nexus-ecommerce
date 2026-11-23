import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { AddressNotFoundException, AddressForbiddenException } from './UpdateAddressUseCase';

export class DeleteAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  public async execute(
    userId: string,
    addressId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data: ReturnType<import('../../domain/entities/Address').Address['toJSON']>[];
  }> {
    const work = async () => {
      const address = await this.addressRepository.findById(addressId);
      if (!address) {
        throw new AddressNotFoundException(addressId);
      }

      if (address.userId !== userId) {
        throw new AddressForbiddenException();
      }

      const wasDefault = address.isDefault;

      // Ràng buộc SCRUM-290: Không cho phép xóa địa chỉ mặc định duy nhất trong sổ địa chỉ
      if (wasDefault) {
        const userAddresses = await this.addressRepository.findByUserId(userId);
        if (userAddresses.length <= 1) {
          throw new Error('Không được phép xóa địa chỉ mặc định duy nhất trong sổ địa chỉ.');
        }
      }

      // 1. Xóa địa chỉ
      await this.addressRepository.delete(addressId);

      // 2. Nếu xóa địa chỉ mặc định, tự động chuyển mặc định cho địa chỉ còn lại tạo sớm nhất (D.6 & P0 #6)
      if (wasDefault) {
        const remaining = await this.addressRepository.findByUserId(userId);
        if (remaining.length > 0) {
          // Ưu tiên địa chỉ tạo sớm nhất.
          const sorted = remaining.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
          );
          const nextDefault = sorted[0];
          await this.addressRepository.setDefault(userId, nextDefault.id);
        }
      }

      return {
        success: true,
        message: 'Địa chỉ đã được xóa thành công.',
        data: (await this.addressRepository.findByUserId(userId)).map((address) =>
          address.toJSON(),
        ),
      };
    };
    return this.addressRepository.withUserTransaction
      ? this.addressRepository.withUserTransaction(userId, work)
      : work();
  }
}
