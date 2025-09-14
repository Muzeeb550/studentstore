'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        if (parsedUser.role !== 'admin') {
          router.push('/');
          return;
        }
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/');
        return;
      }
    } else {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('studentstore_token');
    localStorage.removeItem('studentstore_user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 text-white px-3 py-2 rounded-lg font-bold text-xl">
                🛠️ Admin Panel
              </div>
              <nav className="flex space-x-6">
                <a 
                  href="/admin" 
                  className="text-gray-600 hover:text-red-600 font-medium"
                >
                  Dashboard
                </a>
                <a 
                  href="/admin/products" 
                  className="text-gray-600 hover:text-red-600 font-medium"
                >
                  Products
                </a>
                <a 
                  href="/admin/categories" 
                  className="text-gray-600 hover:text-red-600 font-medium"
                >
                  Categories
                </a>
                <a 
                  href="/admin/banners" 
                  className="text-gray-600 hover:text-red-600 font-medium"
                >
                  Banners
                </a>
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <a 
                href="/" 
                className="text-gray-600 hover:text-indigo-600 font-medium"
              >
                ← Back to Site
              </a>
              <span className="text-gray-700">
                Admin: <strong>{user.email}</strong>
              </span>
              <button 
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
