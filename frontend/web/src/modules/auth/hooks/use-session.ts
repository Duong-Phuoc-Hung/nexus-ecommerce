'use client';
import { useContext } from 'react';
import { SessionContext } from '../context/session-provider';
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider is required.');
  return value;
}
