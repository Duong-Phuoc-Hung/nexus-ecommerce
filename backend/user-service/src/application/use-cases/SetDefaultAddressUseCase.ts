import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { AddressResponseDto } from '../dtos/AddressDto';
import { AddressNotFoundException, AddressForbiddenException } from './UpdateAddressUseCase';

export class SetDefaultAddressUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  public async execute(userId: string, addressId: string): Promise<AddressResponseDto> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) {
      throw new AddressNotFoundException(addressId);
    }

    if (address.userId !== userId) {
      throw new AddressForbiddenException();
    }

    // Đổi mặc định trong một giao dịch nguyên tử (P0 #7)
    await this.addressRepository.setDefault(userId, addressId);

    const updated = await this.addressRepository.findById(addressId);
    return updated!.toJSON();
  }
}
