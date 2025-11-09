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
  const [skillstoreOpen, setSkillstoreOpen] = useState(false);
  const [studentstoreOpen, setStudentstoreOpen] = useState(false);
  const [usersOpen, setUsersOpen] = useState(false);
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
              <nav className="flex space-x-1 relative">
                <a
                  href="/admin"
                  className="text-gray-600 hover:text-red-600 px-3 py-2 font-medium"
                >
                  Dashboard
                </a>

                {/* StudentStore Dropdown */}
                <div className="relative group">
                  <button
                    onClick={() => setStudentstoreOpen(!studentstoreOpen)}
                    className="text-gray-600 hover:text-red-600 px-3 py-2 font-medium flex items-center gap-1"
                  >
                    🛍️ StudentStore
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        studentstoreOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </button>
                  {/* Dropdown Menu */}
                  {studentstoreOpen && (
                    <div className="absolute left-0 mt-0 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <a
                        href="/admin/products"
                        className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        🛒 Products
                      </a>
                      <a
                        href="/admin/categories"
                        className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        🗂️ Categories
                      </a>
                      <a
                        href="/admin/banners"
                        className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        🎨 Banners
                      </a>
                    </div>
                  )}
                </div>

                {/* Users Dropdown */}
                <div className="relative group">
                  <button
                    onClick={() => setUsersOpen(!usersOpen)}
                    className="text-gray-600 hover:text-red-600 px-3 py-2 font-medium flex items-center gap-1"
                  >
                    👥 Users
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        usersOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </button>
                  {/* Dropdown Menu */}
                  {usersOpen && (
                    <div className="absolute left-0 mt-0 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <a
                        href="/admin/posts"
                        className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        📝 Posts
                      </a>
                      <a
                        href="/admin/ratings"
                        className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        ⭐ User Ratings
                      </a>
                      <a
                        href="/admin/recommendations"
                        className="block px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        🎁 Product Recommendations
                      </a>
                    </div>
                  )}
                </div>

                {/* SkillStore Dropdown */}
                <div className="relative group">
                  <button
                    onClick={() => setSkillstoreOpen(!skillstoreOpen)}
                    className="text-gray-600 hover:text-purple-600 px-3 py-2 font-medium flex items-center gap-1"
                  >
                    🎓 SkillStore
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        skillstoreOpen ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </button>
                  {/* Dropdown Menu */}
                  {skillstoreOpen && (
                    <div className="absolute left-0 mt-0 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <a
                        href="/admin/skillstore"
                        className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                      >
                        📈 SkillStore Dashboard
                      </a>

                      <div className="border-t border-gray-200 my-2"></div>

                      <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                        Banners
                      </div>
                      <a
                        href="/admin/skillstore/banners"
                        className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                      >
                        🎨 Manage Banners
                      </a>
                      <a
                        href="/admin/skillstore/banners/create"
                        className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 pl-8"
                      >
                        ➕ Create Banner
                      </a>

                      <div className="border-t border-gray-200 my-2"></div>

                      <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase">
                        Skills
                      </div>
                      <a
                        href="/admin/skillstore/skills"
                        className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600"
                      >
                        🎓 Manage Skills
                      </a>
                      <a
                        href="/admin/skillstore/skills/create"
                        className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 pl-8"
                      >
                        ➕ Create Skill
                      </a>
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <a href="/" className="text-gray-600 hover:text-indigo-600 font-medium">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}
