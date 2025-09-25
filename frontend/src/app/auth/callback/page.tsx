'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface User {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="text-center">
            <div className="text-6xl mb-4">🎓</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              StudentStore Authentication
            </h1>
            <p className="text-gray-600 mb-6">
              Loading authentication...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const [status, setStatus] = useState('Processing authentication...');
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Store token in localStorage
      localStorage.setItem('studentstore_token', token);
      
      // Decode token to get user info (basic decoding, not secure validation)
      try {
        const payload = JSON.parse(atob(token.split('.')[1])) as User;
        localStorage.setItem('studentstore_user', JSON.stringify(payload));
        
        setStatus('✅ Authentication successful! Redirecting...');
        
        // Redirect to home page after 2 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        
      } catch (error) {
        setStatus('❌ Authentication failed. Please try again.');
        console.error('Token parsing error:', error);
      }
    } else {
      setStatus('❌ No authentication token found.');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🎓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            StudentStore Authentication
          </h1>
          <p className="text-gray-600 mb-6">
            {status}
          </p>
          {status.includes('successful') && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          )}
        </div>
      </div>
    </div>
  );
}
