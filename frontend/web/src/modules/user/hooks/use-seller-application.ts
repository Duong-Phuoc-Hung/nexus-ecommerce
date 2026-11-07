'use client';

import { useCallback, useEffect, useState } from 'react';
import { normalizeApiError } from '../../../lib/axios/http';
import { sellerApplicationsApi } from '../api/seller-applications.api';
import type { SellerApplicationMeResponse } from '../types/seller-application.types';

export function useSellerApplication(enabled: boolean = true) {
  const [data, setData] = useState<SellerApplicationMeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string>('');

  const reload = useCallback(async () => {
    if (!enabled) return null;
    setLoading(true);
    setError('');
    try {
      const response = await sellerApplicationsApi.getMyApplication();
      setData(response);
      return response;
    } catch (err) {
      const apiErr = normalizeApiError(err);
      setError(apiErr.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return {
    data,
    setData,
    loading,
    error,
    reload,
  };
}
