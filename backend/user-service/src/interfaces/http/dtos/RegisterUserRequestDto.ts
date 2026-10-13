export interface RegisterUserRequestDto {
  email: string;
  fullName: string;
  password: string;
  role?: string;
}
