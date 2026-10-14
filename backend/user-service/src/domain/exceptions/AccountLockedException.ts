export class AccountLockedException extends Error {
  constructor(lockedUntil?: Date | null) {
    const suffix = lockedUntil ? ` Until ${lockedUntil.toISOString()}.` : '';
    super(`Account is locked${suffix} Please try again later.`);
    this.name = 'AccountLockedException';
  }
}
