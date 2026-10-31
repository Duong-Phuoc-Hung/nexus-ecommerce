export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export interface UserProps {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  reputationScore: number;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: User
 * Đại diện cho người dùng trong Bounded Context User & IAM (SRS 3.1)
 * Tuân thủ nguyên tắc thuần Domain: Không phụ thuộc vào database hay framework bên ngoài.
 */
export class User {
  public static readonly MAX_FAILED_LOGIN_ATTEMPTS = 5;
  public static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000;

  private readonly _id: string;
  private _email: string;
  private _fullName: string;
  private _passwordHash: string;
  private _phone: string;
  private _role: UserRole;
  private _status: UserStatus;
  private _reputationScore: number;
  private _failedLoginAttempts: number;
  private _lockedUntil: Date | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._fullName = props.fullName;
    this._passwordHash = props.passwordHash;
    this._phone = props.phone || '';
    this._role = props.role;
    this._status = props.status;
    this._reputationScore = props.reputationScore;
    this._failedLoginAttempts = props.failedLoginAttempts ?? 0;
    this._lockedUntil = props.lockedUntil ?? null;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get id(): string {
    return this._id;
  }

  public get email(): string {
    return this._email;
  }

  public get fullName(): string {
    return this._fullName;
  }

  public get phone(): string {
    return this._phone;
  }

  public get passwordHash(): string {
    return this._passwordHash;
  }

  public get role(): UserRole {
    return this._role;
  }

  public get roles(): string[] {
    return [this._role];
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get reputationScore(): number {
    return this._reputationScore;
  }

  public get failedLoginAttempts(): number {
    return this._failedLoginAttempts;
  }

  public get lockedUntil(): Date | null {
    return this._lockedUntil;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public isActive(): boolean {
    return this._status === UserStatus.ACTIVE;
  }

  public isLocked(now: Date = new Date()): boolean {
    if (!this._lockedUntil) {
      return false;
    }

    if (this._lockedUntil.getTime() <= now.getTime()) {
      this._lockedUntil = null;
      this._failedLoginAttempts = 0;
      this._updatedAt = new Date();
      return false;
    }

    return true;
  }

  public recordFailedLoginAttempt(): void {
    this._failedLoginAttempts += 1;
    this._updatedAt = new Date();

    if (this._failedLoginAttempts >= User.MAX_FAILED_LOGIN_ATTEMPTS) {
      this._lockedUntil = new Date(Date.now() + User.LOCKOUT_DURATION_MS);
    }
  }

  public resetFailedLoginAttempts(): void {
    this._failedLoginAttempts = 0;
    this._lockedUntil = null;
    this._updatedAt = new Date();
  }

  public updateReputation(delta: number): void {
    this._reputationScore = Math.max(0, this._reputationScore + delta);
    this._updatedAt = new Date();
  }
  public setPasswordHash(passwordHash: string): void {
    this._passwordHash = passwordHash;
    this._updatedAt = new Date();
  }

  public setStatus(status: UserStatus): void {
    this._status = status;
    this._updatedAt = new Date();
  }

  public setRole(role: UserRole): void {
    this._role = role;
    this._updatedAt = new Date();
  }

  public setFullName(fullName: string): void {
    this._fullName = fullName;
    this._updatedAt = new Date();
  }

  public setPhone(phone: string): void {
    this._phone = phone;
    this._updatedAt = new Date();
  }
}
