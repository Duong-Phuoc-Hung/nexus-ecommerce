export interface UserProfileDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  status: string;
  reputationScore: number;
  createdAt: string;
}
