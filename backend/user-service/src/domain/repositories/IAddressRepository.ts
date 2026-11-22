import { Address } from '../entities/Address';

/**
 * Domain Port / Repository Interface: IAddressRepository
 * Định nghĩa hợp đồng lưu trữ và truy xuất sổ địa chỉ của Buyer.
 */
export interface IAddressRepository {
  withUserTransaction?<T>(userId: string, work: () => Promise<T>): Promise<T>;
  findByUserId(userId: string): Promise<Address[]>;
  findById(id: string): Promise<Address | null>;
  countByUserId(userId: string): Promise<number>;
  save(address: Address): Promise<void>;
  update(address: Address): Promise<void>;
  delete(id: string): Promise<void>;
  setDefault(userId: string, addressId: string): Promise<void>;
}
