import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SessionUser } from '@/modules/user/types/user.types';

export type AuthState = {
  user: SessionUser | null;
  accessToken: string | null;
  permissions: string[];
};

const initialState: AuthState = { user: null, accessToken: null, permissions: [] };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionEstablished(
      state,
      action: PayloadAction<{ user: SessionUser; accessToken: string | null }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.permissions = action.payload.user.permissions ?? [];
    },
    sessionCleared(state) {
      state.user = null;
      state.accessToken = null;
      state.permissions = [];
    },
  },
});

export const { sessionEstablished, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
