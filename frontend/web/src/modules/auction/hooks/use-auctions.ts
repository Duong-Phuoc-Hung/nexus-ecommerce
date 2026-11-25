'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { auctionApi, type Auction } from '../api/auction.api';
import { getAuctionSocket } from '../utils/auction-socket';

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
    let debounceTimer: number | null = null;
    const scheduleRefresh = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void reload();
      }, 250);
    };
    const off = auctionApi.subscribe(scheduleRefresh);
    const socket = getAuctionSocket();
    let hasJoinedOnce = Boolean(socket.connected);
    const joinFeed = () => {
      socket.emit('join_auctions_feed');
      if (hasJoinedOnce) scheduleRefresh();
      hasJoinedOnce = true;
    };
    socket.on('connect', joinFeed);
    if (socket.connected) socket.emit('join_auctions_feed');
    socket.on('auctions:changed', scheduleRefresh);
    socket.on('auction:bid_placed', scheduleRefresh);
    socket.on('auction:buy_now', scheduleRefresh);
    socket.on('auction:created', scheduleRefresh);
    socket.on('auction:updated', scheduleRefresh);
    socket.on('auction:cancelled', scheduleRefresh);
    const onOnline = () => scheduleRefresh();
    window.addEventListener('online', onOnline);
    return () => {
      generation.current++;
      if (debounceTimer) window.clearTimeout(debounceTimer);
      off();
      socket.off('connect', joinFeed);
      if (socket.connected) socket.emit('leave_auctions_feed');
      socket.off('auctions:changed', scheduleRefresh);
      socket.off('auction:bid_placed', scheduleRefresh);
      socket.off('auction:buy_now', scheduleRefresh);
      socket.off('auction:created', scheduleRefresh);
      socket.off('auction:updated', scheduleRefresh);
      socket.off('auction:cancelled', scheduleRefresh);
      window.removeEventListener('online', onOnline);
    };
  }, [reload]);
  return { rows, loading, error, reload, refreshing };
}
