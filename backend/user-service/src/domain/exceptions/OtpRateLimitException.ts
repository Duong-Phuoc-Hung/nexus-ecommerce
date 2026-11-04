/**
 * Domain Exception: OtpRateLimitException
 * Bắn ra khi người dùng yêu cầu gửi mã OTP quá nhanh (dưới 60s cooldown)
 * hoặc vượt quá số lần cho phép trong một khoảng thời gian (Rate Limiting).
 */
export class OtpRateLimitException extends Error {
  public readonly retryAfterSeconds: number;

  constructor(
    message: string = 'Vui lòng đợi trước khi yêu cầu gửi lại mã OTP mới.',
    retryAfterSeconds: number = 60,
  ) {
    super(message);
    this.name = 'OtpRateLimitException';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
