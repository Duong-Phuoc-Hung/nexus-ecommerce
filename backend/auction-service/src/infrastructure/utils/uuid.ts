import crypto from 'node:crypto';

/**
 * Sinh chuỗi UUID v7 chuẩn RFC 9562 (Time-ordered UUID)
 * - 48 bit đầu: Unix timestamp theo mili-giây (sắp xếp được theo thời gian)
 * - Version 7 (0b0111) & Variant 1 (0b10)
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');
  const rand = crypto.randomBytes(10);
  rand[0] = (rand[0] & 0x0f) | 0x70;
  rand[2] = (rand[2] & 0x3f) | 0x80;
  const randHex = rand.toString('hex');
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-${randHex.slice(0, 4)}-${randHex.slice(4, 8)}-${randHex.slice(8, 20)}`;
}
