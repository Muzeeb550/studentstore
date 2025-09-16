'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

interface User {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

interface DashboardStats {
  wishlistCount: number;
  productsViewed: number;
  memberSince: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    wishlistCount: 0,
    productsViewed: 0,
    memberSince: 'Today'
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        fetchDashboardStats();
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

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      // Fetch wishlist count
      const wishlistResponse = await fetch('http://localhost:5000/api/wishlist/count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (wishlistResponse.ok) {
        const wishlistResult = await wishlistResponse.json();
        if (wishlistResult.status === 'success') {
          setStats(prev => ({
            ...prev,
            wishlistCount: wishlistResult.data.count
          }));
        }
      }

      // For now, we'll simulate other stats. Later we'll add real API endpoints
      setStats(prev => ({
        ...prev,
        productsViewed: 0, // Will be dynamic later
        memberSince: 'Today' // Will be calculated from user creation date
      }));

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />
      
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Welcome back, {user.email.split('@')[0]}! 👋
          </h1>
          <p className="text-xl text-gray-600">
            Here's your personal StudentStore dashboard
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Wishlist Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">My Wishlist</p>
                {statsLoading ? (
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-red-600">{stats.wishlistCount}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">Saved products</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Products Viewed */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Products Viewed</p>
                {statsLoading ? (
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-blue-600">{stats.productsViewed}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">This month</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Account Type</p>
                <p className="text-3xl font-bold text-purple-600 capitalize">{user.role}</p>
                <p className="text-sm text-gray-500 mt-1">Member since {stats.memberSince}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <a
            href="/wishlist"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-lg group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">View Wishlist</p>
                <p className="text-sm text-gray-500">
                  {stats.wishlistCount > 0 ? `${stats.wishlistCount} items saved` : 'Start saving items'}
                </p>
              </div>
            </div>
          </a>

          <a
            href="/profile"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-lg group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Edit Profile</p>
                <p className="text-sm text-gray-500">Update your info</p>
              </div>
            </div>
          </a>

          <a
            href="/"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-lg group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Browse Products</p>
                <p className="text-sm text-gray-500">Discover new items</p>
              </div>
            </div>
          </a>

          <a
            href="/search"
            className="bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all duration-200 hover:shadow-lg group"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 group-hover:bg-yellow-200 rounded-lg flex items-center justify-center mr-3 transition-colors duration-200">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Search Products</p>
                <p className="text-sm text-gray-500">Find what you need</p>
              </div>
            </div>
          </a>
        </div>

        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">
            {stats.wishlistCount > 0 ? '🎯 Keep Exploring!' : '🎉 Welcome to StudentStore!'}
          </h2>
          <p className="text-lg opacity-90 mb-4">
            {stats.wishlistCount > 0 
              ? `You have ${stats.wishlistCount} item${stats.wishlistCount > 1 ? 's' : ''} saved in your wishlist. Continue discovering amazing deals made for students!`
              : 'Your dashboard is ready! Start exploring products, build your wishlist, and discover amazing deals made for students.'
            }
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/"
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm"
            >
              {stats.wishlistCount > 0 ? 'Continue Shopping' : 'Start Shopping'}
            </a>
            <a
              href="/profile"
              className="bg-white text-indigo-600 hover:bg-gray-100 px-6 py-3 rounded-xl font-medium transition-all duration-200"
            >
              Complete Profile
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
