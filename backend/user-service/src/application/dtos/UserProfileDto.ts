export interface UserProfileDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  status: string;
  reputationScore: number;
  dateOfBirth?: string | null;
  gender?: string | null;
  updatedAt?: string;
  createdAt: string;
}
