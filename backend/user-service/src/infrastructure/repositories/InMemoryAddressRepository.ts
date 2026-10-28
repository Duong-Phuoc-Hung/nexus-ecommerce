import { IAddressRepository } from '../../domain/repositories/IAddressRepository';
import { Address } from '../../domain/entities/Address';

export class InMemoryAddressRepository implements IAddressRepository {
  private readonly addresses: Map<string, Address> = new Map();

  public async findByUserId(userId: string): Promise<Address[]> {
    const list: Address[] = [];
    for (const addr of this.addresses.values()) {
      if (addr.userId === userId) {
        list.push(addr);
      }
    }
    // Sắp xếp: Mặc định lên đầu, sau đó theo thời gian tạo tăng dần
    return list.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  public async findById(id: string): Promise<Address | null> {
    return this.addresses.get(id) || null;
  }

  public async countByUserId(userId: string): Promise<number> {
    let count = 0;
    for (const addr of this.addresses.values()) {
      if (addr.userId === userId) {
        count++;
      }
    }
    return count;
  }

  public async save(address: Address): Promise<void> {
    this.addresses.set(address.id, address);
  }

  public async update(address: Address): Promise<void> {
    this.addresses.set(address.id, address);
  }

  public async delete(id: string): Promise<void> {
    this.addresses.delete(id);
  }

  public async setDefault(userId: string, addressId: string): Promise<void> {
    for (const addr of this.addresses.values()) {
      if (addr.userId === userId) {
        addr.setDefault(addr.id === addressId);
      }
    }
  }
}
