import { timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { verifyBearerToken } from './auth';

export function authorizeEmail(mode: 'otp' | 'welcome' | 'send' | 'password-reset') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key =
      process.env.EMAIL_DELIVERY_SECRET ||
      (process.env.NODE_ENV !== 'production'
        ? 'nexus_email_delivery_secret_for_dev_and_test_32_chars'
        : '');
    const presented = req.get('x-email-delivery-key');
    const expected = Buffer.from(key || '');
    const actual = Buffer.from(presented || '');
    const internal =
      expected.length >= 32 &&
      expected.length === actual.length &&
      timingSafeEqual(expected, actual);
    const secrets = [process.env.JWT_SECRET, process.env.JWT_ACCESS_SECRET].filter(
      (value): value is string => Boolean(value),
    );
    const admin = verifyBearerToken(req.headers.authorization, secrets);
    const authorized =
      internal || (admin?.roles.includes('ADMIN') && mode !== 'otp' && mode !== 'password-reset');
    if (!authorized) {
      res
        .status(admin ? 403 : 401)
        .json({ success: false, error: 'Email delivery not authorized.' });
      return;
    }
    const { email, otp, fullName, title, body, resetToken } = req.body || {};
    const recipient =
      typeof email === 'string' &&
      email.length <= 254 &&
      /^[A-Z0-9.!#$%&'*+/=?^_{}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email) &&
      !/[\r\n]/.test(email);
    const shortText = (value: unknown, max: number): boolean =>
      typeof value === 'string' &&
      Boolean(value.trim()) &&
      value.length <= max &&
      !/[\r\n]/.test(value);
    const validMessage =
      mode === 'send'
        ? shortText(title, 200) &&
          typeof body === 'string' &&
          Boolean(body.trim()) &&
          body.length <= 20000
        : mode === 'otp'
          ? typeof otp === 'string' &&
            /^\d{6}$/.test(otp) &&
            (fullName == null || shortText(fullName, 200))
          : mode === 'password-reset'
            ? shortText(resetToken, 256) && (fullName == null || shortText(fullName, 200))
            : shortText(fullName, 200);
    if (!recipient || !validMessage) {
      res.status(400).json({ success: false, error: 'Invalid email delivery request.' });
      return;
    }
    next();
  };
}
