'use client';

import { useState, useRef, useEffect } from 'react';
import { AuthUser } from '@/store/slices/authSlice';

interface UserMenuProps {
  user: AuthUser;
  onSignOut: () => void;
}

export function UserMenu({ user, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    setIsOpen(false);
    onSignOut();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* User Avatar/Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        {/* Avatar Circle */}
        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
        
        {/* User Name */}
        <span className="text-sm text-gray-300 hidden sm:block">
          {user.username}
        </span>
        
        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg border z-50"
          style={{
            backgroundColor: '#1a1a1b',
            borderColor: '#333334',
          }}
        >
          {/* User Info Section */}
          <div className="px-4 py-3 border-b" style={{ borderColor: '#333334' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  ID: {String(user.id)}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* User Details */}
            <div className="px-4 py-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                Account Details
              </p>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">User ID:</span>
                  <span className="text-xs text-gray-300 font-mono">
                    {String(user.id).slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Cognito ID:</span>
                  <span className="text-xs text-gray-300 font-mono">
                    {String(user.cognito_sub).slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Created:</span>
                  <span className="text-xs text-gray-300">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t mx-4 my-2" style={{ borderColor: '#333334' }}></div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}