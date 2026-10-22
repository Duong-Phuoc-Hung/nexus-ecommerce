// Product API naming facade; implementation and contract normalization remain in catalog.factory.
export { catalogApi as productApi } from './catalog.api';
export type {
  CatalogCategory as ProductCategory,
  CatalogPage as ProductPage,
  CatalogProduct as Product,
  CatalogQuery as ProductQuery,
  ProductInput,
} from '../types/product.types';
