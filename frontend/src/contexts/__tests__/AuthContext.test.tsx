import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthContextProvider, useAuth } from '../AuthContext';

// Mock react-oidc-context
vi.mock('react-oidc-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: vi.fn(),
}));

// Mock environment variables
const mockEnv = {
  NEXT_PUBLIC_COGNITO_REGION: 'us-east-1',
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: 'us-east-1_test123',
  NEXT_PUBLIC_COGNITO_CLIENT_ID: 'test_client_id',
};

Object.defineProperty(process, 'env', {
  value: mockEnv,
});

// Test component that uses the auth context
function TestComponent() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
      </div>
      <div data-testid="user-info">
        {user ? `User: ${user.profile?.sub}` : 'No User'}
      </div>
      <button onClick={signIn} data-testid="sign-in">Sign In</button>
      <button onClick={signOut} data-testid="sign-out">Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  const mockUseAuth = vi.mocked(await import('react-oidc-context')).useAuth;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide authentication context when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
    } as any);

    render(
      <AuthContextProvider>
        <TestComponent />
      </AuthContextProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('No User');
  });

  it('should provide authentication context when authenticated', () => {
    const mockUser = {
      access_token: 'token123',
      profile: {
        sub: 'user123',
        email: 'test@example.com',
      },
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
    } as any);

    render(
      <AuthContextProvider>
        <TestComponent />
      </AuthContextProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('User: user123');
  });

  it('should show loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
    } as any);

    render(
      <AuthContextProvider>
        <TestComponent />
      </AuthContextProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Loading');
  });

  it('should handle sign in', async () => {
    const mockSigninRedirect = vi.fn();
    
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      signinRedirect: mockSigninRedirect,
      signoutRedirect: vi.fn(),
    } as any);

    render(
      <AuthContextProvider>
        <TestComponent />
      </AuthContextProvider>
    );

    const signInButton = screen.getByTestId('sign-in');
    signInButton.click();

    await waitFor(() => {
      expect(mockSigninRedirect).toHaveBeenCalled();
    });
  });

  it('should handle sign out', async () => {
    const mockSignoutRedirect = vi.fn();
    
    mockUseAuth.mockReturnValue({
      user: { access_token: 'token123' },
      isLoading: false,
      error: null,
      signinRedirect: vi.fn(),
      signoutRedirect: mockSignoutRedirect,
    } as any);

    render(
      <AuthContextProvider>
        <TestComponent />
      </AuthContextProvider>
    );

    const signOutButton = screen.getByTestId('sign-out');
    signOutButton.click();

    await waitFor(() => {
      expect(mockSignoutRedirect).toHaveBeenCalled();
    });
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthContextProvider');

    consoleSpy.mockRestore();
  });

  it('should provide access token', () => {
    const mockUser = {
      access_token: 'token123',
      profile: { sub: 'user123' },
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      error: null,
      signinRedirect: vi.fn(),
      signoutRedirect: vi.fn(),
    } as any);

    function TokenTestComponent() {
      const { getAccessToken } = useAuth();
      return <div data-testid="token">{getAccessToken()}</div>;
    }

    render(
      <AuthContextProvider>
        <TokenTestComponent />
      </AuthContextProvider>
    );

    expect(screen.getByTestId('token')).toHaveTextContent('token123');
  });
});