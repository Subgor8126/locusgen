import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '@/store';
import { setOidcUser, setAuthLoading, fetchUserProfile, migrateAnonymousSession } from '@/store/slices/authSlice';
import { getSessionProjects } from '@/utils/sessionStorage';

/**
 * Hook to synchronize OIDC authentication state with Redux store
 */
export function useAuthSync() {
  const { user: oidcUser, isLoading: oidcLoading, getAccessToken } = useAuth();
  const dispatch = useAppDispatch();
  const { user: reduxUser, sessionMigrationStatus } = useAppSelector((state) => state.auth);

  // Sync OIDC user with Redux
  useEffect(() => {
    dispatch(setOidcUser(oidcUser));
    dispatch(setAuthLoading(oidcLoading));
  }, [oidcUser, oidcLoading, dispatch]);

  // Fetch user profile when OIDC user is available but Redux user is not
  useEffect(() => {
    if (oidcUser && !reduxUser && !oidcLoading) {
      const accessToken = getAccessToken();
      if (accessToken) {
        dispatch(fetchUserProfile(accessToken));
      }
    }
  }, [oidcUser, reduxUser, oidcLoading, getAccessToken, dispatch]);

  // Handle session migration when user authenticates
  useEffect(() => {
    if (
      oidcUser && 
      reduxUser && 
      !oidcLoading && 
      sessionMigrationStatus === 'idle'
    ) {
      // Check if there are anonymous projects to migrate
      const sessionProjects = getSessionProjects();
      if (sessionProjects.length > 0) {
        const accessToken = getAccessToken();
        if (accessToken) {
          dispatch(migrateAnonymousSession({
            projectIds: sessionProjects,
            accessToken,
          }));
        }
      }
    }
  }, [oidcUser, reduxUser, oidcLoading, sessionMigrationStatus, getAccessToken, dispatch]);

  return {
    isAuthenticated: !!oidcUser && !!reduxUser,
    isLoading: oidcLoading,
    user: reduxUser,
    oidcUser,
    sessionMigrationStatus,
  };
}