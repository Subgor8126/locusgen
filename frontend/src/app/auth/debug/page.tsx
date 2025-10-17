"use client";

import { useEffect, useState } from 'react';

export default function AuthDebug() {
  const [config, setConfig] = useState<any>(null);
  const [testUrls, setTestUrls] = useState<any>(null);

  useEffect(() => {
    const cfg = {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      region: process.env.NEXT_PUBLIC_COGNITO_REGION,
    };
    setConfig(cfg);

    // Generate test URLs
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const redirectUri = `${baseUrl}/auth/callback`;
    
    const params = new URLSearchParams({
      client_id: cfg.clientId || '',
      response_type: 'code',
      scope: 'openid email profile',
      redirect_uri: redirectUri,
    });

    setTestUrls({
      loginUrl: `https://${cfg.domain}/login?${params.toString()}`,
      redirectUri,
      baseUrl,
      authority: `https://cognito-idp.${cfg.region}.amazonaws.com/${cfg.userPoolId}`,
      oidcConfig: `https://cognito-idp.${cfg.region}.amazonaws.com/${cfg.userPoolId}/.well-known/openid_configuration`,
    });
  }, []);

  const testOidcDiscovery = async () => {
    try {
      console.log('Testing OIDC Discovery...');
      const response = await fetch(testUrls.oidcConfig);
      const data = await response.json();
      console.log('✅ OIDC Discovery successful:', data);
      
      // Check if our redirect URI matches what Cognito expects
      console.log('🔍 Checking authorization endpoint:', data.authorization_endpoint);
      console.log('🔍 Our redirect URI:', testUrls.redirectUri);
      
      alert('✅ OIDC Discovery successful! Check console for details.');
    } catch (error) {
      console.error('❌ OIDC Discovery failed:', error);
      alert('❌ OIDC Discovery failed: ' + error);
    }
  };

  const testDirectLogin = () => {
    console.log('🚀 Testing direct login with URL:', testUrls.loginUrl);
    console.log('📍 Redirect URI:', testUrls.redirectUri);
    
    // Log the exact parameters being sent
    const url = new URL(testUrls.loginUrl);
    console.log('📋 Parameters being sent:');
    url.searchParams.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    window.location.href = testUrls.loginUrl;
  };

  const checkCognitoClient = async () => {
    // This won't work from browser due to CORS, but shows what we should check
    console.log('🔍 To check Cognito client configuration, run this AWS CLI command:');
    console.log(`aws cognito-idp describe-user-pool-client --user-pool-id ${config?.userPoolId} --client-id ${config?.clientId} --region ${config?.region}`);
    
    alert('Check console for AWS CLI command to verify client configuration');
  };

  if (!config || !testUrls) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 Cognito Debug Tool</h1>
      
      {/* Configuration */}
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-3">📋 Configuration</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>User Pool ID:</strong> {config.userPoolId}</div>
          <div><strong>Client ID:</strong> {config.clientId}</div>
          <div><strong>Domain:</strong> {config.domain}</div>
          <div><strong>Region:</strong> {config.region}</div>
        </div>
      </div>

      {/* URLs */}
      <div className="mb-6 p-4 bg-blue-50 rounded">
        <h2 className="text-xl font-semibold mb-3">🔗 Generated URLs</h2>
        <div className="space-y-2 text-sm">
          <div><strong>Authority:</strong> <code className="bg-white p-1 rounded">{testUrls.authority}</code></div>
          <div><strong>OIDC Config:</strong> <code className="bg-white p-1 rounded">{testUrls.oidcConfig}</code></div>
          <div><strong>Redirect URI:</strong> <code className="bg-white p-1 rounded">{testUrls.redirectUri}</code></div>
          <div><strong>Login URL:</strong> <code className="bg-white p-1 rounded break-all">{testUrls.loginUrl}</code></div>
        </div>
      </div>

      {/* Test Buttons */}
      <div className="mb-6 space-x-4">
        <button
          onClick={testOidcDiscovery}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          🧪 Test OIDC Discovery
        </button>
        
        <button
          onClick={checkCognitoClient}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
        >
          🔍 Check Client Config
        </button>
        
        <button
          onClick={testDirectLogin}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          🚀 Test Direct Login
        </button>
      </div>

      {/* Troubleshooting */}
      <div className="p-4 bg-yellow-50 rounded">
        <h2 className="text-xl font-semibold mb-3">🛠️ Troubleshooting Steps</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li><strong>Test OIDC Discovery first</strong> - This verifies basic connectivity</li>
          <li><strong>Check Client Config</strong> - Verify callback URLs match exactly</li>
          <li><strong>Check browser console</strong> - Look for detailed error messages</li>
          <li><strong>Try Direct Login</strong> - This will show the exact error from Cognito</li>
        </ol>
      </div>

      {/* Expected vs Actual */}
      <div className="mt-6 p-4 bg-red-50 rounded">
        <h2 className="text-xl font-semibold mb-3">❌ Common Error Causes</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Callback URL mismatch:</strong> Extra slash, wrong protocol, wrong port</li>
          <li><strong>Invalid client ID:</strong> Typo in environment variable</li>
          <li><strong>Domain not ready:</strong> CloudFront distribution still deploying</li>
          <li><strong>Scope issues:</strong> Requesting unavailable scopes</li>
          <li><strong>CORS issues:</strong> Browser blocking requests</li>
        </ul>
      </div>
    </div>
  );
}