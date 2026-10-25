import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CatalogProduct, CatalogQuery } from '@/modules/catalog/types/product.types';

type CatalogState = {
  products: CatalogProduct[];
  query: CatalogQuery;
  cart: { productId: string; quantity: number }[];
};

const initialState: CatalogState = {
  products: [],
  cart: [],
  query: {
    q: '',
    categoryId: '',
    minPrice: '',
    maxPrice: '',
    condition: '',
    sort: 'featured',
    page: 1,
    pageSize: 12,
  },
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {
    productsReceived(state, action: PayloadAction<CatalogProduct[]>) {
      state.products = action.payload;
    },
    catalogQueryChanged(state, action: PayloadAction<Partial<CatalogQuery>>) {
      state.query = { ...state.query, ...action.payload };
    },
    catalogCleared(state) {
      state.products = [];
    },
    cartItemAdded(state, action: PayloadAction<{ productId: string; quantity?: number }>) {
      const quantity = Math.max(1, Math.floor(action.payload.quantity ?? 1));
      const existing = state.cart.find((item) => item.productId === action.payload.productId);
      if (existing) existing.quantity += quantity;
      else state.cart.push({ productId: action.payload.productId, quantity });
    },
    cartItemRemoved(state, action: PayloadAction<string>) {
      state.cart = state.cart.filter((item) => item.productId !== action.payload);
    },
    cartQuantityChanged(state, action: PayloadAction<{ productId: string; quantity: number }>) {
      const item = state.cart.find((entry) => entry.productId === action.payload.productId);
      if (!item) return;
      if (action.payload.quantity < 1) {
        state.cart = state.cart.filter((entry) => entry.productId !== action.payload.productId);
      } else {
        item.quantity = Math.floor(action.payload.quantity);
      }
    },
  },
});

export const {
  productsReceived,
  catalogQueryChanged,
  catalogCleared,
  cartItemAdded,
  cartItemRemoved,
  cartQuantityChanged,
} = catalogSlice.actions;
export default catalogSlice.reducer;
