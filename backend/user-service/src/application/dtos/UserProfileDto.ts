export interface UserProfileDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  status: string;
  reputationScore: number;
  identifyNumber?: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string;
  reputationHistory?: Array<{
    points: number;
    reason: string;
    adjustedBy: string;
    createdAt: string;
  }>;
  restrictions?: Array<{
    restriction: string;
    durationDays: number;
    reason: string;
    appliedBy: string;
    expiresAt: string;
    createdAt: string;
  }>;
  updatedAt?: string;
  createdAt: string;
}
