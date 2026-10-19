import { ApiError } from '../../../lib/axios/http';
import type { SessionUser } from '../../user/types/user.types';
const sessionEvent = 'nexus:session-change';
export const SESSION_EVENT = sessionEvent;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('nexus.accessToken') || localStorage.getItem('nexus.accessToken');
  } catch {
    return null;
  }
}

export function getSessionUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('nexus.user') || localStorage.getItem('nexus.user');
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}
export function clearSession() {
  if (typeof window === 'undefined') return;
  try {
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try {
        window[name].removeItem('nexus.accessToken');
        window[name].removeItem('nexus.user');
      } catch {
        /* A blocked storage area must not prevent local sign-out. */
      }
    }
  } finally {
    window.dispatchEvent(new Event(sessionEvent));
  }
}
export function saveSession(token: string, user: SessionUser, remember = false) {
  clearSession();
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('nexus.accessToken', token);
    storage.setItem('nexus.user', JSON.stringify(user));
  } catch {
    throw new ApiError(
      'Trình duyệt không cho phép lưu phiên đăng nhập. Vui lòng kiểm tra cài đặt lưu trữ.',
    );
  }
  window.dispatchEvent(new Event(sessionEvent));
}
