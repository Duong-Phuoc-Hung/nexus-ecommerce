import { IUserRepository, UserSearchCriteria } from '../../domain/repositories/IUserRepository';
import {
  SearchUsersQueryDto,
  SearchUsersResultDto,
  UserSearchItemDto,
} from '../dtos/SearchUsersDto';

/**
 * Use Case: SearchUsersUseCase
 * Nghiệp vụ tìm kiếm và tra cứu danh sách người dùng cho Support Staff và Quản trị viên (Admin).
 * Tuân thủ Clean Architecture / DDD, độc lập với cơ sở dữ liệu và HTTP framework.
 */
export class SearchUsersUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(query: SearchUsersQueryDto): Promise<SearchUsersResultDto> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));

    // Chuẩn hóa và bảo vệ tiêu chí lọc (SRS A-F139-04: mặc định sắp xếp theo fullName tăng dần)
    const resolvedSortBy = this.validateSortBy(query.sortBy);
    const resolvedSortOrder: 'asc' | 'desc' = query.sortOrder
      ? query.sortOrder.toLowerCase() === 'desc'
        ? 'desc'
        : 'asc'
      : resolvedSortBy === 'fullName'
        ? 'asc'
        : 'desc';

    const criteria: UserSearchCriteria = {
      q: query.q?.trim() || undefined,
      email: query.email?.trim().toLowerCase() || undefined,
      role: query.role?.trim().toUpperCase() || undefined,
      status: query.status?.trim().toUpperCase() || undefined,
      page,
      limit,
      sortBy: resolvedSortBy,
      sortOrder: resolvedSortOrder,
    };

    const searchResult = await this.userRepository.search(criteria);

    const items: UserSearchItemDto[] = searchResult.users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      name: user.fullName, // Frontend compatibility alias
      email: user.email,
      phone: user.phone || '',
      identifyNumber: user.identifyNumber ?? null,
      gender: user.gender ?? null,
      dateOfBirth: user.dateOfBirth ?? null,
      address: user.address ?? null,
      role: user.role,
      status: user.status,
      reputationScore: user.reputationScore,
      reputation: user.reputationScore, // Frontend compatibility alias
      ordersCount: 0,
      orders: 0, // Frontend compatibility alias
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return {
      items,
      pagination: {
        total: searchResult.total,
        page: searchResult.page,
        limit: searchResult.limit,
        totalPages: searchResult.totalPages,
      },
    };
  }

  private validateSortBy(sortBy?: string): 'createdAt' | 'fullName' | 'email' | 'reputationScore' {
    switch (sortBy) {
      case 'createdAt':
      case 'fullName':
      case 'email':
      case 'reputationScore':
        return sortBy;
      default:
        return 'fullName';
    }
  }
}
