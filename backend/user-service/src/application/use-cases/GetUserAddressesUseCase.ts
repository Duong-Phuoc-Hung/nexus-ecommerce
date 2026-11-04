import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { AddressResponseDto } from '../dtos/AddressDto';

export class GetUserAddressesUseCase {
  constructor(private readonly addressRepository: IAddressRepository) {}

  public async execute(userId: string): Promise<AddressResponseDto[]> {
    if (!userId || !userId.trim()) {
      throw new Error('User ID không hợp lệ.');
    }

    const addresses = await this.addressRepository.findByUserId(userId.trim());
    return addresses.map((addr) => addr.toJSON());
  }
}
