'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { auctionApi, type Auction } from '../api/auction.api';
export function useAuctions() {
  const [rows, setRows] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setRefreshing(true);
    try {
      const data = await auctionApi.list();
      if (request === generation.current) {
        setRows(data);
        setError('');
      }
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : 'Không tải được phiên đấu.');
    } finally {
      if (request === generation.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);
  useEffect(() => {
    void reload();
    const refresh = () => {
      if (!document.hidden) void reload();
    };
    const off = auctionApi.subscribe(refresh);
    const timer = setInterval(refresh, 3000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      generation.current++;
      off();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload]);
  return { rows, loading, error, reload, refreshing };
}
