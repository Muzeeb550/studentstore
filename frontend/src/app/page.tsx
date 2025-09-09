'use client';

import { useState, useEffect } from 'react';

// Define user type
interface User {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('studentstore_token');
    localStorage.removeItem('studentstore_user');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-xl">
                🎓 StudentStore
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-600 hover:text-indigo-600 font-medium">
                Products
              </a>
              <a href="#" className="text-gray-600 hover:text-indigo-600 font-medium">
                Courses
              </a>
              <a href="#" className="text-gray-600 hover:text-indigo-600 font-medium">
                Reviews
              </a>
            </nav>

            {/* Auth Section */}
            <div>
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700">
                    Hello, <strong>{user.email}</strong>
                  </span>
                  <button 
                    onClick={handleLogout}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => window.location.href = 'http://localhost:5000/auth/google'}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {user && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-green-800">
              🎉 Welcome back! You're signed in as a <strong>{user.role}</strong>.
            </p>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Find the Best Products for 
            <span className="text-indigo-600"> Student Life</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Discover products and courses recommended by fellow students. 
            Real reviews, real experiences, real savings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-medium transition-colors">
              Browse Products
            </button>
            <button className="border border-indigo-600 text-indigo-600 hover:bg-indigo-50 px-8 py-3 rounded-lg font-medium transition-colors">
              Explore Courses
            </button>
          </div>
        </div>

        {/* Categories Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {[
            { icon: '📚', name: 'Textbooks', desc: 'New & used books for all subjects' },
            { icon: '💻', name: 'Electronics', desc: 'Laptops, tablets, accessories' },
            { icon: '✏️', name: 'Stationery', desc: 'Notebooks, pens, supplies' },
            { icon: '🎒', name: 'Campus Gear', desc: 'Backpacks, clothing, dorm items' },
            { icon: '📖', name: 'Online Courses', desc: 'Skills & certifications' },
            { icon: '🍕', name: 'Campus Life', desc: 'Food, services, essentials' },
          ].map((category, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="text-4xl mb-4">{category.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-gray-600">{category.desc}</p>
            </div>
          ))}
        </div>

        {/* Status Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Platform Status</h2>
          <div className="space-y-2">
            <p className="text-green-600">✅ Backend Connected</p>
            <p className="text-green-600">✅ Database Ready</p>
            <p className="text-green-600">✅ Google OAuth Working</p>
            {user && (
              <p className="text-green-600">✅ User Authenticated: {user.email}</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">🎓 StudentStore</div>
            <p className="text-gray-400">
              By students, for students. Find the best products for your college journey.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
