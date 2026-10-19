'use client';
import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { authApi, type AuthUser } from '@/modules/auth/api/auth.api';
import { clearSession, getToken, SESSION_EVENT } from '../utils/session';
import { userMessage } from '../../../lib/axios/http';

type Session = {
  user: AuthUser | null;
  phase: 'loading' | 'ready' | 'error';
  error: string;
  retry: () => void;
  logout: () => Promise<void>;
};
export const SessionContext = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [phase, setPhase] = useState<Session['phase']>('loading');
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const retry = useCallback(() => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setError('');
    if (!getToken()) {
      setUser(null);
      setPhase('ready');
      return;
    }
    setPhase('loading');
    authApi
      .getProfile(request.signal)
      .then((profile) => {
        if (request.signal.aborted) return;
        if (profile.status !== 'ACTIVE') {
          clearSession();
          return;
        }
        setUser(profile);
        setPhase('ready');
      })
      .catch((err) => {
        if (request.signal.aborted) return;
        setUser(null);
        setError(userMessage(err));
        setPhase(getToken() ? 'error' : 'ready');
      });
  }, []);
  useEffect(() => {
    retry();
    window.addEventListener(SESSION_EVENT, retry);
    window.addEventListener('storage', retry);
    return () => {
      controller.current?.abort();
      window.removeEventListener(SESSION_EVENT, retry);
      window.removeEventListener('storage', retry);
    };
  }, [retry]);
  async function logout() {
    setError('');
    try {
      await authApi.logout();
    } catch {
      setError(
        'Đã đăng xuất trên thiết bị. Hệ thống chưa xác nhận thu hồi phiên; vui lòng thử lại nếu cần.',
      );
    } finally {
      setUser(null);
      setPhase('ready');
    }
  }
  return (
    <SessionContext.Provider value={{ user, phase, error, retry, logout }}>
      {children}
    </SessionContext.Provider>
  );
}
