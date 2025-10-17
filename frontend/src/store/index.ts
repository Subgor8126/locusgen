import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import projectsReducer from './slices/projectsSlice';
import chatReducer from './slices/chatSlice';
import sceneReducer from './slices/sceneSlice';
import authReducer from './slices/authSlice';
import { apiMiddleware } from './middleware/apiMiddleware';
import { errorMiddleware } from './middleware/errorMiddleware';


export const store = configureStore({
  reducer: {
    projects: projectsReducer,
    chat: chatReducer,
    scene: sceneReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serializable check
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(apiMiddleware, errorMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks for use throughout the app
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;