import assert from 'node:assert/strict';
import test from 'node:test';
import { AssignUserRoleUseCase } from './AssignUserRoleUseCase';
import { LoginUseCase } from './LoginUseCase';
import { RegisterUserUseCase } from './RegisterUserUseCase';
import { RequestPasswordResetUseCase } from './RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from './ResetPasswordUseCase';
import { InMemoryUserRepository } from '../../infrastructure/repositories/InMemoryUserRepository';
import { AuthTokenStore } from '../../infrastructure/security/AuthTokenStore';
import { PasswordResetTokenStore } from '../../infrastructure/security/PasswordResetTokenStore';

test('registration creates a buyer account and password reset is single-use', async () => {
  const users = new InMemoryUserRepository();
  const register = new RegisterUserUseCase(users);
  const login = new LoginUseCase(users);
  const resetTokens = new PasswordResetTokenStore();
  const sessions = new AuthTokenStore();
  const requestReset = new RequestPasswordResetUseCase(users, resetTokens);
  const resetPassword = new ResetPasswordUseCase(users, resetTokens, sessions);

  const created = await register.execute({
    email: '  NEW.USER@example.com ',
    fullName: 'New User',
    password: 'LongPassword123!',
  });

  assert.equal(created.email, 'new.user@example.com');
  assert.equal(created.role, 'BUYER');
  assert.equal('passwordHash' in created, false);
  await login.execute(created.email, 'LongPassword123!');

  const token = await requestReset.execute(created.email);
  assert.ok(token);
  await resetPassword.execute(token, 'UpdatedPassword123!');
  await login.execute(created.email, 'UpdatedPassword123!');
  await assert.rejects(resetPassword.execute(token, 'AnotherPassword123!'), /invalid or expired/);
});

test('password rules are consistent: 6 characters minimum for register and reset', async () => {
  const users = new InMemoryUserRepository();
  const register = new RegisterUserUseCase(users);
  const login = new LoginUseCase(users);
  const resetTokens = new PasswordResetTokenStore();
  const requestReset = new RequestPasswordResetUseCase(users, resetTokens);
  const resetPassword = new ResetPasswordUseCase(users, resetTokens, new AuthTokenStore());

  await assert.rejects(
    register.execute({ email: 'short@example.com', fullName: 'Short', password: '12345' }),
    /at least 6/,
  );
  const created = await register.execute({
    email: 'six@example.com',
    fullName: 'Six',
    password: '123456',
  });

  const token = await requestReset.execute(created.email);
  assert.ok(token);
  await assert.rejects(resetPassword.execute(token, '12345'), /at least 6/);
  await resetPassword.execute(token, '654321');
  await login.execute(created.email, '654321');
});

test('changing a user role revokes their active sessions', async () => {
  const users = new InMemoryUserRepository();
  const sessions = new AuthTokenStore();
  const buyerId = '01a15822-43b8-78c3-a246-16bff78bc6e8';
  sessions.track('active-session-token', buyerId);

  const assignRole = new AssignUserRoleUseCase(users, (userId) => {
    sessions.revokeUserTokens(userId);
  });
  const result = await assignRole.execute(buyerId, 'SELLER');

  assert.equal(result.role, 'SELLER');
  assert.equal(sessions.isRevoked('active-session-token'), true);
  await assert.rejects(assignRole.execute(buyerId, 'ROOT'), /Role must be/);
});

test('account locks after 5 consecutive failed login attempts', async () => {
  const users = new InMemoryUserRepository();
  const register = new RegisterUserUseCase(users);
  const login = new LoginUseCase(users);

  const created = await register.execute({
    email: 'lock.user@example.com',
    fullName: 'Locked User',
    password: 'LongPassword123!',
  });

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await assert.rejects(
      () => login.execute(created.email, `WrongPassword${attempt}!`),
      /Invalid email or password\./,
    );

    const userAfterAttempt = await users.findByEmail(created.email);
    assert.equal(userAfterAttempt?.failedLoginAttempts, attempt);
    assert.equal(userAfterAttempt?.isLocked(), false);
  }

  await assert.rejects(
    () => login.execute(created.email, 'WrongPassword5!'),
    /account is locked|locked/i,
  );

  const lockedUser = await users.findByEmail(created.email);
  assert.equal(lockedUser?.isLocked(), true);

  await assert.rejects(
    () => login.execute(created.email, 'LongPassword123!'),
    /account is locked|locked/i,
  );
});
