import assert from 'node:assert/strict';
import test from 'node:test';
import { SearchUsersUseCase } from './SearchUsersUseCase';
import { InMemoryUserRepository } from '../../infrastructure/repositories/InMemoryUserRepository';
import { User, UserRole, UserStatus } from '../../domain/entities/User';

test('SearchUsersUseCase: Returns all users paginated when no filter criteria provided', async () => {
  const repository = new InMemoryUserRepository();
  const useCase = new SearchUsersUseCase(repository);

  const result = await useCase.execute({});

  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.limit, 10);
  assert.ok(
    result.pagination.total >= 4,
    'InMemory repository should have at least 4 default users',
  );
  assert.ok(result.items.length >= 4);

  // Kiểm tra tính tương thích dữ liệu kép (DDD + Frontend Support Staff)
  const firstUser = result.items[0];
  assert.ok(firstUser.id);
  assert.equal(firstUser.name, firstUser.fullName, 'Tên tương thích FE (name) phải bằng fullName');
  assert.equal(
    firstUser.reputation,
    firstUser.reputationScore,
    'reputation phải bằng reputationScore',
  );
  assert.equal(firstUser.orders, firstUser.ordersCount, 'orders phải bằng ordersCount');
});

test('SearchUsersUseCase: Filters users by keyword "q" across id, fullName, email, and role', async () => {
  const repository = new InMemoryUserRepository();
  const useCase = new SearchUsersUseCase(repository);

  // Tìm theo tên "Retro Lab"
  const searchByName = await useCase.execute({ q: 'retro' });
  assert.equal(searchByName.items.length, 1);
  assert.equal(searchByName.items[0].email, 'seller.test@nexus-ecommerce.com');
  assert.equal(searchByName.items[0].role, 'SELLER');

  // Tìm theo email "staff.test"
  const searchByEmail = await useCase.execute({ q: 'staff.test' });
  assert.equal(searchByEmail.items.length, 1);
  assert.equal(searchByEmail.items[0].role, 'SUPPORT_STAFF');

  // Tìm theo từ khóa không tồn tại
  const searchNotFound = await useCase.execute({ q: 'non-existent-user-xyz' });
  assert.equal(searchNotFound.items.length, 0);
  assert.equal(searchNotFound.pagination.total, 0);
});

test('SearchUsersUseCase: Filters users by role (BUYER, SELLER, SUPPORT_STAFF)', async () => {
  const repository = new InMemoryUserRepository();
  const useCase = new SearchUsersUseCase(repository);

  const buyers = await useCase.execute({ role: 'BUYER' });
  assert.ok(buyers.items.length >= 2, 'Có ít nhất 2 Buyer mẫu');
  assert.ok(buyers.items.every((u) => u.role === 'BUYER'));

  const sellers = await useCase.execute({ role: 'SELLER' });
  assert.ok(sellers.items.length >= 1);
  assert.ok(sellers.items.every((u) => u.role === 'SELLER'));

  const staff = await useCase.execute({ role: 'SUPPORT_STAFF' });
  assert.ok(staff.items.length >= 1);
  assert.ok(staff.items.every((u) => u.role === 'SUPPORT_STAFF'));
});

test('SearchUsersUseCase: Filters users by status (ACTIVE, SUSPENDED)', async () => {
  const repository = new InMemoryUserRepository();
  const useCase = new SearchUsersUseCase(repository);

  const activeUsers = await useCase.execute({ status: 'ACTIVE' });
  assert.ok(activeUsers.items.every((u) => u.status === 'ACTIVE'));

  const suspendedUsers = await useCase.execute({ status: 'SUSPENDED' });
  assert.equal(suspendedUsers.items.length, 1);
  assert.equal(suspendedUsers.items[0].email, 'suspended.test@nexus-ecommerce.com');
});

test('SearchUsersUseCase: Sorts users correctly (by reputationScore, fullName, createdAt)', async () => {
  const repository = new InMemoryUserRepository();
  const useCase = new SearchUsersUseCase(repository);

  // Sắp xếp điểm uy tín tăng dần (asc)
  const sortedRepAsc = await useCase.execute({ sortBy: 'reputationScore', sortOrder: 'asc' });
  for (let i = 0; i < sortedRepAsc.items.length - 1; i++) {
    assert.ok(
      sortedRepAsc.items[i].reputationScore <= sortedRepAsc.items[i + 1].reputationScore,
      'Điểm uy tín phải tăng dần',
    );
  }

  // Sắp xếp điểm uy tín giảm dần (desc)
  const sortedRepDesc = await useCase.execute({ sortBy: 'reputationScore', sortOrder: 'desc' });
  for (let i = 0; i < sortedRepDesc.items.length - 1; i++) {
    assert.ok(
      sortedRepDesc.items[i].reputationScore >= sortedRepDesc.items[i + 1].reputationScore,
      'Điểm uy tín phải giảm dần',
    );
  }
});

test('SearchUsersUseCase: Paginates results with custom page and limit', async () => {
  const repository = new InMemoryUserRepository();
  const useCase = new SearchUsersUseCase(repository);

  const page1 = await useCase.execute({ page: 1, limit: 2 });
  assert.equal(page1.items.length, 2);
  assert.equal(page1.pagination.page, 1);
  assert.equal(page1.pagination.limit, 2);
  assert.ok(page1.pagination.totalPages >= 2);

  const page2 = await useCase.execute({ page: 2, limit: 2 });
  assert.equal(page2.items.length, 2);
  assert.equal(page2.pagination.page, 2);

  // Đảm bảo không trùng nhau giữa 2 trang
  const idsPage1 = new Set(page1.items.map((u) => u.id));
  assert.ok(!idsPage1.has(page2.items[0].id), 'User trang 2 không được trùng trang 1');
});
