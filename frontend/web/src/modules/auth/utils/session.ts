import { ApiError } from '../../../lib/axios/http';
import { clearAllResources } from '../../../lib/axios/resource-cache';
import type { SessionUser } from '../../user/types/user.types';
const sessionEvent = 'nexus:session-change';
export const SESSION_EVENT = sessionEvent;
export const AUTH_STORAGE_KEYS = new Set(['nexus.accessToken', 'nexus.refreshToken', 'nexus.user']);

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('nexus.accessToken') || localStorage.getItem('nexus.accessToken');
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      sessionStorage.getItem('nexus.refreshToken') || localStorage.getItem('nexus.refreshToken')
    );
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

export function isSessionRemembered(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (localStorage.getItem('nexus.accessToken')) return true;
    if (sessionStorage.getItem('nexus.accessToken')) return false;
  } catch {
    // Fallback to localStorage
  }
  return true;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  clearAllResources();
  try {
    for (const name of ['sessionStorage', 'localStorage'] as const) {
      try {
        window[name].removeItem('nexus.accessToken');
        window[name].removeItem('nexus.refreshToken');
        window[name].removeItem('nexus.user');
      } catch {
        /* A blocked storage area must not prevent local sign-out. */
      }
    }
  } finally {
    window.dispatchEvent(new Event(sessionEvent));
  }
}

export function saveSession(
  token: string,
  user: SessionUser,
  remember = true,
  refreshToken?: string | null,
) {
  if (typeof window === 'undefined') return;
  clearAllResources();
  try {
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;

    try {
      secondary.removeItem('nexus.accessToken');
      secondary.removeItem('nexus.refreshToken');
      secondary.removeItem('nexus.user');
    } catch {
      /* Ignore secondary storage cleanup failure */
    }

    const prevToken = primary.getItem('nexus.accessToken');
    if (prevToken !== token) {
      primary.setItem('nexus.accessToken', token);
    }
    if (refreshToken) {
      const prevRefresh = primary.getItem('nexus.refreshToken');
      if (prevRefresh !== refreshToken) {
        primary.setItem('nexus.refreshToken', refreshToken);
      }
    }
    const serializedUser = JSON.stringify(user);
    if (primary.getItem('nexus.user') !== serializedUser) {
      primary.setItem('nexus.user', serializedUser);
    }
    // Mirror into sessionStorage so same-tab navigation after external PayOS redirect never loses session
    if (remember) {
      try {
        if (sessionStorage.getItem('nexus.accessToken') !== token) {
          sessionStorage.setItem('nexus.accessToken', token);
        }
        if (refreshToken && sessionStorage.getItem('nexus.refreshToken') !== refreshToken) {
          sessionStorage.setItem('nexus.refreshToken', refreshToken);
        }
        if (sessionStorage.getItem('nexus.user') !== serializedUser) {
          sessionStorage.setItem('nexus.user', serializedUser);
        }
      } catch {
        /* Ignore sessionStorage mirror failure */
      }
    }
  } catch {
    throw new ApiError(
      'Trình duyệt không cho phép lưu phiên đăng nhập. Vui lòng kiểm tra cài đặt lưu trữ.',
    );
  }
  window.dispatchEvent(new Event(sessionEvent));
}
