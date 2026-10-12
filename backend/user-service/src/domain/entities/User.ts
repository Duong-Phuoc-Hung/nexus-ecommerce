export enum UserRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
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
  role: UserRole;
  status: UserStatus;
  reputationScore: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Domain Entity: User
 * Đại diện cho người dùng trong Bounded Context User & IAM (SRS 3.1)
 * Tuân thủ nguyên tắc thuần Domain: Không phụ thuộc vào database hay framework bên ngoài.
 */
export class User {
  private readonly _id: string;
  private _email: string;
  private _fullName: string;
  private _passwordHash: string;
  private _role: UserRole;
  private _status: UserStatus;
  private _reputationScore: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    this._id = props.id;
    this._email = props.email;
    this._fullName = props.fullName;
    this._passwordHash = props.passwordHash;
    this._role = props.role;
    this._status = props.status;
    this._reputationScore = props.reputationScore;
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

  public get role(): UserRole {
    return this._role;
  }

  public get status(): UserStatus {
    return this._status;
  }

  public get reputationScore(): number {
    return this._reputationScore;
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

  public updateReputation(delta: number): void {
    this._reputationScore = Math.max(0, this._reputationScore + delta);
    this._updatedAt = new Date();
  }
}
