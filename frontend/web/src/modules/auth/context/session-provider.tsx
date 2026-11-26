'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authApi, type AuthUser } from '@/modules/auth/api/auth.api';
import {
  AUTH_STORAGE_KEYS,
  clearSession,
  getSessionUser,
  getToken,
  SESSION_EVENT,
} from '../utils/session';
import { userMessage } from '../../../lib/axios/http';
import { clearAllResources } from '../../../lib/axios/resource-cache';
import { useAppDispatch } from '@/store/hooks';
import { sessionCleared, sessionEstablished } from '@/store/slices/authSlice';

type Session = {
  user: AuthUser | null;
  phase: 'loading' | 'ready' | 'error';
  error: string;
  retry: () => void;
  logout: () => Promise<void>;
};

export const SessionContext = createContext<Session | null>(null);

function isSameAuthUser(a: AuthUser | null, b: AuthUser | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.fullName === b.fullName &&
    a.role === b.role &&
    a.status === b.status &&
    a.reputationScore === b.reputationScore
  );
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phase, setPhase] = useState<Session['phase']>('loading');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchProfile = useCallback(
    (forceLoadingState: boolean) => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      setError('');

      const token = getToken();
      const tokenChanged = token !== lastTokenRef.current;
      if (tokenChanged) {
        clearAllResources();
        lastTokenRef.current = token;
      }

      if (!token) {
        hasLoadedRef.current = true;
        setUser(null);
        setPhase('ready');
        dispatch(sessionCleared());
        return;
      }

      // Only show loading state on cold boot or when switching tokens; never unmount active screens on silent refresh
      if (forceLoadingState || !hasLoadedRef.current || tokenChanged) {
        setPhase('loading');
      }

      authApi
        .getProfile(request.signal)
        .then((profile) => {
          if (request.signal.aborted) return;
          if (profile.status !== 'ACTIVE') {
            clearSession();
            return;
          }
          hasLoadedRef.current = true;
          setUser((prev) => (isSameAuthUser(prev, profile) ? prev : profile));
          dispatch(sessionEstablished({ user: profile, accessToken: token }));
          setPhase('ready');
        })
        .catch((err) => {
          if (request.signal.aborted) return;
          hasLoadedRef.current = true;
          const remainingToken = getToken();
          if (!remainingToken) {
            setUser(null);
            dispatch(sessionCleared());
            setError(userMessage(err));
            setPhase('ready');
            return;
          }
          // Lỗi mạng tạm thời hoặc service đang bận nhưng token vẫn còn hợp lệ:
          // Giữ lại thông tin người dùng hiện có (hoặc khôi phục từ storage) để không tự logout Buyer
          const fallbackUser = getSessionUser();
          setUser((prev) => {
            const resolved = prev ?? fallbackUser;
            if (resolved) {
              dispatch(sessionEstablished({ user: resolved, accessToken: remainingToken }));
            }
            return resolved;
          });
          setError(userMessage(err));
          setPhase('ready');
        });
    },
    [dispatch],
  );

  const retry = useCallback(() => {
    fetchProfile(false);
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile(true);

    const onSessionEvent = () => {
      fetchProfile(false);
    };

    // CRITICAL: Only react to auth storage keys, NEVER to inbox/address/cart cache writes from other tabs!
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && !AUTH_STORAGE_KEYS.has(event.key)) {
        return;
      }
      const nextToken = getToken();
      if (nextToken === lastTokenRef.current) {
        return;
      }
      fetchProfile(false);
    };

    window.addEventListener(SESSION_EVENT, onSessionEvent);
    window.addEventListener('storage', onStorage);
    return () => {
      controller.current?.abort();
      window.removeEventListener(SESSION_EVENT, onSessionEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    setError('');
    try {
      await authApi.logout();
    } catch {
      setError(
        'Đã đăng xuất trên thiết bị. Hệ thống chưa xác nhận thu hồi phiên; vui lòng thử lại nếu cần.',
      );
    } finally {
      clearAllResources();
      lastTokenRef.current = null;
      setUser(null);
      dispatch(sessionCleared());
      setPhase('ready');
    }
  }, [dispatch]);

  const contextValue = useMemo<Session>(
    () => ({ user, phase, error, retry, logout }),
    [user, phase, error, retry, logout],
  );

  return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>;
}
