'use client';

import { createContext, useContext, useMemo } from 'react';
import { createCatalogApi } from '../../../../../shared/catalog';
import { requestApi } from '../../../services/api-client';

const adminCatalogApi = createCatalogApi(requestApi, 'api');
const Context = createContext({ api: adminCatalogApi, productsPath: '/products' });

export function AdminCatalogProvider({
  children,
  productsPath = '/admin/products',
}: {
  children: React.ReactNode;
  productsPath?: string;
}) {
  const value = useMemo(() => ({ api: adminCatalogApi, productsPath }), [productsPath]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminCatalog() {
  return useContext(Context);
}
