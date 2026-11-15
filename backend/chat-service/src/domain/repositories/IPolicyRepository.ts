import { PlatformPolicy } from '../entities/PlatformPolicy';

export interface IPolicyRepository {
  findById(id: string): Promise<PlatformPolicy | null>;
  findByCode(code: string): Promise<PlatformPolicy | null>;
  search(query: string, category?: string): Promise<PlatformPolicy[]>;
  listAllActive(): Promise<PlatformPolicy[]>;
  save(policy: PlatformPolicy): Promise<void>;
}
