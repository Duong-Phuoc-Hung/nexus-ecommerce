export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  reputationScore?: number;
  permissions?: string[];
};
export type UserType = SessionUser;
export type RegisterResult = Omit<SessionUser, 'permissions'>;
