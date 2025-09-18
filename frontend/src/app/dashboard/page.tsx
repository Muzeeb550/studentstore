'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StarRating from '../components/StarRating';

interface User {
  id: number;
  name: string;
  display_name: string;
  email: string;
  profile_picture: string;
  role: string;
}

interface RecentReview {
  id: number;
  rating: number;
  review_text: string;
  review_images: string;
  created_at: string;
  updated_at: string;
  product_id: number;
  product_name: string;
  product_images: string;
}

interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_date: string | null;
}

interface DashboardStats {
  wishlist_count: number;
  products_viewed: number;
  member_since: string;
  member_since_raw: string;
  days_since_joining: number;
  total_reviews: number;
  average_rating_given: number;
  first_review_date: string | null;
  latest_review_date: string | null;
}

interface DashboardData {
  user: User;
  stats: DashboardStats;
  recent_reviews: RecentReview[];
  achievement_badges: AchievementBadge[];
  account_status: string;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        fetchDashboardData();
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/');
        return;
      }
    } else {
      router.push('/');
      return;
    }
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('http://localhost:5000/api/users/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseProductImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  const getDisplayName = () => {
    if (!data?.user) return 'User';
    return data.user.name || data.user.display_name || data.user.email.split('@')[0];
  };

  const getProfilePicture = () => {
    return data?.user?.profile_picture || '';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.substring(0, 2).toUpperCase();
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

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />
      
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-12">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            {/* Profile Picture */}
            {getProfilePicture() ? (
              <img
                src={getProfilePicture()}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-indigo-200 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {getInitials()}
              </div>
            )}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Welcome back, {getDisplayName()}! 👋
              </h1>
              <p className="text-xl text-gray-600">
                Member since {formatDate(data.stats.member_since)} • {data.stats.days_since_joining} days
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Wishlist Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">My Wishlist</p>
                <p className="text-3xl font-bold text-red-600">{data.stats.wishlist_count}</p>
                <p className="text-sm text-gray-500 mt-1">Saved products</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Reviews Written */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Reviews Written</p>
                <p className="text-3xl font-bold text-green-600">{data.stats.total_reviews}</p>
                <p className="text-sm text-gray-500 mt-1">Helpful feedback</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Average Rating Given */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Rating Given</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {data.stats.total_reviews > 0 ? data.stats.average_rating_given.toFixed(1) : '0.0'}
                </p>
                <p className="text-sm text-gray-500 mt-1">Out of 5.0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Account Type */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Account Type</p>
                <p className="text-3xl font-bold text-purple-600 capitalize">{data.user.role}</p>
                <p className="text-sm text-gray-500 mt-1">{data.achievement_badges.length} badges earned</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Achievement Badges */}
        {data.achievement_badges.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 Your Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.achievement_badges.map((badge) => (
                <div key={badge.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  <div className="text-center">
                    <div className="text-4xl mb-3">{badge.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{badge.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{badge.description}</p>
                    {badge.earned_date && (
                      <p className="text-xs text-gray-500">
                        Earned {formatDate(badge.earned_date)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {data.recent_reviews.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">📝 Your Recent Reviews</h2>
             <a
                href="/my-reviews"
                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
              >
                View all reviews →
              </a>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.recent_reviews.slice(0, 4).map((review) => {
                const productImages = parseProductImages(review.product_images);
                const firstImage = productImages[0] || '';
                
                return (
                  <div key={review.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                    <div className="flex items-start space-x-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={review.product_name}
                            className="w-16 h-16 object-cover rounded-xl border border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Review Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {review.product_name}
                          </h3>
                          <StarRating rating={review.rating} size="sm" showRatingText={false} />
                        </div>
                        
                        {review.review_text && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                            {review.review_text}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {formatDate(review.created_at)}
                          </p>
                          <a
                            href={`/products/${review.product_id}`}
                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                          >
                            View Product →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Reviews Message */}
        {data.recent_reviews.length === 0 && (
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 text-center">
              <div className="text-6xl mb-4">✍️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-600 mb-6">Start sharing your experiences with products to help other students!</p>
              <a
                href="/"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Browse Products
              </a>
            </div>
          </div>
        )}

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
                  {data.stats.wishlist_count > 0 ? `${data.stats.wishlist_count} items saved` : 'Start saving items'}
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
            {data.stats.total_reviews > 0 ? '🎯 Keep Contributing!' : '🎉 Welcome to StudentStore!'}
          </h2>
          <p className="text-lg opacity-90 mb-4">
            {data.stats.total_reviews > 0 
              ? `You've written ${data.stats.total_reviews} review${data.stats.total_reviews > 1 ? 's' : ''} and helped the community! Continue sharing your experiences with products.`
              : 'Your dashboard is ready! Start exploring products, build your wishlist, and share your experiences through reviews.'
            }
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/"
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm"
            >
              {data.stats.wishlist_count > 0 ? 'Continue Shopping' : 'Start Shopping'}
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
