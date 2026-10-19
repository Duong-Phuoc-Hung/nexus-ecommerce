'use client';

import { createContext, useContext, useMemo } from 'react';
import { createCatalogApi } from '../../../../../shared/catalog';
import { catalogApi } from '../api/catalog.api';

const Context = createContext({ api: catalogApi, productsPath: '/products' });
// The preview owns a read-only adapter, regardless of the app's API environment.
const preview = {
  api: createCatalogApi(async () => {
    throw new Error('Preview cannot send HTTP requests.');
  }, 'mock'),
  productsPath: '/admin/products',
};

export function AdminCatalogProvider({
  children,
  productsPath = '/admin/products',
}: {
  children: React.ReactNode;
  productsPath?: string;
}) {
  const value = useMemo(() => ({ api: catalogApi, productsPath }), [productsPath]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminCatalog() {
  return useContext(Context);
}
