'use client';

import { useEffect, useState } from 'react';

export default function AuthTest() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setConfig({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      region: process.env.NEXT_PUBLIC_COGNITO_REGION,
    });
  }, []);

  const handleDirectSignIn = () => {
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    
    const authUrl = `https://${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=email+openid+profile&redirect_uri=${redirectUri}`;
    
    console.log('Auth URL:', authUrl);
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Environment Configuration:</h2>
        <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Direct Sign In:</h2>
        <button
          onClick={handleDirectSignIn}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Sign In with Cognito
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Expected Auth URL:</h2>
        <div className="bg-gray-800 p-4 rounded text-sm break-all">
          https://{config?.domain}/login?client_id={config?.clientId}&response_type=code&scope=email+openid+profile&redirect_uri={encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`)}
        </div>
      </div>
    </div>
  );
}