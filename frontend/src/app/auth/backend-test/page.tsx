"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function BackendTest() {
  const { user, isAuthenticated, getAccessToken } = useAuth();
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (endpoint: string, requiresAuth = false) => {
    setLoading(true);
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (requiresAuth) {
        const token = getAccessToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      console.log(`Testing ${endpoint} with headers:`, headers);

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      const data = await response.text();
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch {
        parsedData = data;
      }

      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          status: response.status,
          statusText: response.statusText,
          data: parsedData,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          ok: response.ok,
        }
      }));

      console.log(`✅ ${endpoint}:`, response.status, parsedData);
    } catch (error) {
      console.error(`❌ ${endpoint}:`, error);
      setTestResults(prev => ({
        ...prev,
        [endpoint]: {
          error: error.message,
        }
      }));
    }
    setLoading(false);
  };

  const runAllTests = async () => {
    console.log('🧪 Running backend tests...');
    console.log('User authenticated:', isAuthenticated);
    console.log('User data:', user);
    
    // Test endpoints in order
    await testEndpoint('/health/');
    await testEndpoint('/debug/');
    await testEndpoint('/api/auth/status/');
    
    if (isAuthenticated) {
      await testEndpoint('/api/auth/profile/', true);
      await testEndpoint('/api/auth/validate/', true);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔧 Backend Test Tool</h1>
      
      {/* Auth Status */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-xl font-semibold mb-3">🔐 Authentication Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</div>
          <div><strong>User ID:</strong> {user?.profile?.sub || 'N/A'}</div>
          <div><strong>Email:</strong> {user?.profile?.email || 'N/A'}</div>
          <div><strong>Access Token:</strong> {getAccessToken() ? '✅ Present' : '❌ Missing'}</div>
        </div>
      </div>

      {/* Test Button */}
      <div className="mb-6">
        <button
          onClick={runAllTests}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded"
        >
          {loading ? '🔄 Testing...' : '🧪 Test Backend Endpoints'}
        </button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {Object.entries(testResults).map(([endpoint, result]: [string, any]) => (
          <div key={endpoint} className="p-4 border rounded">
            <h3 className="font-semibold mb-2">
              {endpoint} 
              {result.status && (
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  result.status < 300 ? 'bg-green-100 text-green-800' :
                  result.status < 400 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {result.status} {result.statusText}
                </span>
              )}
            </h3>
            
            {result.error && (
              <div className="text-red-600 mb-2">
                <strong>Error:</strong> {result.error}
              </div>
            )}
            
            {result.data && (
              <div className="bg-gray-100 p-2 rounded text-sm">
                <strong>Response:</strong>
                <pre className="mt-1 overflow-x-auto">
                  {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
            
            {result.headers && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-600">Response Headers</summary>
                <pre className="text-xs bg-gray-50 p-2 rounded mt-1">
                  {JSON.stringify(result.headers, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 rounded">
        <h2 className="text-xl font-semibold mb-3">📋 Troubleshooting</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Connection refused:</strong> Backend not running - start with <code>python manage.py runserver</code></li>
          <li><strong>403 Forbidden:</strong> CORS issue - check CORS_ALLOWED_ORIGINS in Django settings</li>
          <li><strong>401 Unauthorized:</strong> JWT token issue - check token format and Cognito config</li>
          <li><strong>404 Not Found:</strong> URL pattern issue - check Django URLs</li>
          <li><strong>500 Internal Error:</strong> Backend error - check Django logs</li>
        </ul>
      </div>
    </div>
  );
}