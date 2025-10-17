"use client";

import { useEffect, useState } from 'react';

export default function SimpleAuthTest() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    setConfig({
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      region: process.env.NEXT_PUBLIC_COGNITO_REGION,
    });
  }, []);

  const handleSimpleLogin = () => {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    
    const loginUrl = `https://${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/login?${params.toString()}`;
    console.log('Login URL:', loginUrl);
    window.location.href = loginUrl;
  };

  const testOidcDiscovery = async () => {
    try {
      const response = await fetch(
        `https://cognito-idp.${process.env.NEXT_PUBLIC_COGNITO_REGION}.amazonaws.com/${process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID}/.well-known/openid_configuration`
      );
      const data = await response.json();
      console.log('OIDC Discovery:', data);
      alert('OIDC Discovery successful! Check console for details.');
    } catch (error) {
      console.error('OIDC Discovery failed:', error);
      alert('OIDC Discovery failed: ' + error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Auth Test</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Configuration:</h2>
        <pre className="text-sm">{JSON.stringify(config, null, 2)}</pre>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleSimpleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          Test Simple Login
        </button>

        <button
          onClick={testOidcDiscovery}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded ml-4"
        >
          Test OIDC Discovery
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded">
        <h3 className="font-semibold mb-2">Expected Login URL:</h3>
        <div className="text-sm break-all">
          https://{config?.domain}/login?client_id={config?.clientId}&response_type=code&scope=openid+email+profile&redirect_uri={encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`)}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">OIDC Authority:</h3>
        <div className="text-sm break-all">
          https://cognito-idp.{config?.region}.amazonaws.com/{config?.userPoolId}
        </div>
      </div>
    </div>
  );
}