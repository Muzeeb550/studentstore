'use client';

import { useEffect, useState } from 'react';

export default function TestPage() {
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    const testBackend = async () => {
      try {
        const response = await fetch('http://localhost:5000/health');
        const data = await response.json();
        setBackendStatus(`✅ Backend connected: ${data.status}`);
      } catch (error) {
        setBackendStatus(`❌ Backend connection failed`);
      }
    };

    testBackend();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🎓 StudentStore Frontend Test
        </h1>
        <p className="text-gray-600">
          Backend Status: {backendStatus}
        </p>
      </div>
    </div>
  );
}
