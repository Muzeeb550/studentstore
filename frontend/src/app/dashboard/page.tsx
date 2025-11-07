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
  helpful_count: number;
  not_helpful_count: number;
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
  const [activeTab, setActiveTab] = useState('overview');
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

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/users/dashboard-stats`, {
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
    if (!data?.user) return 'Student';
    return data.user.name || data.user.display_name || data.user.email.split('@')[0];
  };

  const getProfilePicture = () => {
    return data?.user?.profile_picture || '';
  };

  const getInitials = () => {
    const name = getDisplayName();
    return name.substring(0, 2).toUpperCase();
  };

  const getStudentLevel = () => {
    if (!data) return { level: 'Newcomer', color: 'student-blue' };
    
    const totalActivity = data.stats.total_reviews + data.stats.wishlist_count;
    
    if (totalActivity >= 50) return { level: 'Student Expert', color: 'student-orange' };
    if (totalActivity >= 25) return { level: 'Active Student', color: 'student-green' };
    if (totalActivity >= 10) return { level: 'Rising Student', color: 'student-blue' };
    return { level: 'New Student', color: 'student-secondary' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-student-secondary font-medium text-sm sm:text-base">
              Loading your dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-12 sm:py-20">
          <div className="text-center">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">😕</div>
            <h1 className="text-xl sm:text-2xl font-bold text-student-primary mb-2 sm:mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-student-secondary mb-4 sm:mb-6 text-sm sm:text-base">
              {error}
            </p>
            <button
              onClick={fetchDashboardData}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-sm sm:text-base"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const studentLevel = getStudentLevel();

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />
      
      {/* Breadcrumb - MOBILE RESPONSIVE */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 md:pt-8">
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-student-secondary mb-4 sm:mb-6 bg-student-card rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 shadow-md overflow-x-auto">
          <a href="/" className="hover:text-student-blue transition-colors font-medium whitespace-nowrap flex-shrink-0">
            🏠 StudentStore
          </a>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold whitespace-nowrap flex-shrink-0">
            📊 Dashboard
          </span>
        </nav>
      </div>

      {/* Header - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 pb-6 sm:pb-8 md:pb-12">
        <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-border-light mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            {/* Profile Picture */}
            {getProfilePicture() ? (
              <img
                src={getProfilePicture()}
                alt="Profile"
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full object-cover ring-4 ring-student-blue/20 shadow-lg flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-student-blue to-student-green rounded-full flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-bold shadow-lg flex-shrink-0">
                {getInitials()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1 sm:mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-student-primary break-words">
                  Welcome back, {getDisplayName()}! 👋
                </h1>
                <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-${studentLevel.color}/20 text-${studentLevel.color} whitespace-nowrap`}>
                  {studentLevel.level}
                </span>
              </div>
              <p className="text-xs sm:text-sm md:text-base text-student-secondary break-words">
                🎓 StudentStore Member since {formatDate(data.stats.member_since)} • {data.stats.days_since_joining} days strong
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - MOBILE RESPONSIVE */}
        <div className="bg-student-card rounded-lg sm:rounded-xl shadow-lg border border-border-light mb-6 sm:mb-8">
          <div className="flex gap-1 p-1.5 sm:p-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm md:text-base truncate ${
                activeTab === 'overview'
                  ? 'bg-student-blue text-white shadow-md'
                  : 'text-student-primary hover:bg-student-light'
              }`}
            >
              📊 Overview
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm md:text-base truncate ${
                activeTab === 'achievements'
                  ? 'bg-student-orange text-white shadow-md'
                  : 'text-student-primary hover:bg-student-light'
              }`}
            >
              🏆 Achievements
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid - MOBILE RESPONSIVE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 md:mb-12">
              {/* Wishlist Stats */}
              <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-border-light hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-secondary mb-0.5 sm:mb-1">
                      💖 My Wishlist
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-student-orange break-words">
                      {data.stats.wishlist_count}
                    </p>
                    <p className="text-xs sm:text-sm text-student-secondary mt-0.5 sm:mt-1">
                      Saved products
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-student-orange/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Reviews Written */}
              <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-border-light hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-secondary mb-0.5 sm:mb-1">
                      ⭐ Reviews Written
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-student-green break-words">
                      {data.stats.total_reviews}
                    </p>
                    <p className="text-xs sm:text-sm text-student-secondary mt-0.5 sm:mt-1">
                      Helping students
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-student-green/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Avg Rating Given */}
              <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-border-light hover:shadow-2xl transition-all duration-300">
                <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-secondary mb-0.5 sm:mb-1">
                      📊 Avg Rating Given
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-warning break-words">
                      {data.stats.total_reviews > 0 ? data.stats.average_rating_given.toFixed(1) : '0.0'}
                    </p>
                    <p className="text-xs sm:text-sm text-student-secondary mt-0.5 sm:mt-1">
                      Out of 5.0 stars
                    </p>
                  </div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-warning/20 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-warning" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Reviews - MOBILE RESPONSIVE */}
            {data.recent_reviews.length > 0 && (
              <div className="mb-6 sm:mb-8 md:mb-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary flex items-center gap-1 sm:gap-2">
                    📝 Your Recent Reviews
                  </h2>
                  <a
                    href="/my-reviews"
                    className="text-student-blue hover:text-student-green font-medium text-xs sm:text-sm transition-colors duration-200 whitespace-nowrap"
                  >
                    View all reviews →
                  </a>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                  {data.recent_reviews.slice(0, 4).map((review) => {
                    const productImages = parseProductImages(review.product_images);
                    const firstImage = productImages[0] || '';
                    
                    return (
                      <div key={review.id} className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-border-light hover:shadow-2xl transition-all duration-300">
                        <div className="flex gap-2 sm:gap-3 md:gap-4">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {firstImage ? (
                              <img
                                src={firstImage}
                                alt={review.product_name}
                                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover rounded-lg border-2 border-border-light"
                              />
                            ) : (
                              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-student-light rounded-lg flex items-center justify-center border-2 border-border-light flex-shrink-0">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Review Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1 mb-1 sm:mb-2">
                              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-student-primary truncate">
                                {review.product_name}
                              </h3>
                              <div className="flex-shrink-0">
                                <StarRating rating={review.rating} size="sm" showRatingText={false} />
                              </div>
                            </div>
                            
                            {review.review_text && (
                              <p className="text-xs sm:text-sm text-student-secondary mb-2 line-clamp-2">
                                {review.review_text}
                              </p>
                            )}
                            
                            {/* Review Footer */}
                            <div className="flex flex-col gap-1 sm:gap-1.5 pt-2 sm:pt-3 border-t border-border-light mt-2 sm:mt-3">
                              {/* Vote Display */}
                              {(review.helpful_count > 0 || review.not_helpful_count > 0) && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {review.helpful_count > 0 && (
                                    <div className="flex items-center gap-0.5 text-xs bg-student-green/10 px-1.5 py-0.5 rounded-full">
                                      <svg className="w-2.5 h-2.5 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                      </svg>
                                      <span className="font-semibold text-student-green">{review.helpful_count}</span>
                                    </div>
                                  )}
                                  
                                  {review.not_helpful_count > 0 && (
                                    <div className="flex items-center gap-0.5 text-xs bg-student-orange/10 px-1.5 py-0.5 rounded-full">
                                      <svg className="w-2.5 h-2.5 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                      </svg>
                                      <span className="font-semibold text-student-orange">{review.not_helpful_count}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Bottom Row */}
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs text-student-secondary whitespace-nowrap">
                                  📅 {formatDate(review.created_at)}
                                </p>
                                <a
                                  href={`/products/${review.product_id}`}
                                  className="text-student-blue hover:text-student-green text-xs font-medium transition-colors duration-200 whitespace-nowrap"
                                >
                                  View →
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* No Reviews Message - MOBILE RESPONSIVE */}
            {data.recent_reviews.length === 0 && (
              <div className="mb-6 sm:mb-8 md:mb-12">
                <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-6 sm:p-8 border border-border-light text-center">
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">✍️</div>
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-student-primary mb-1 sm:mb-2">
                    No Reviews Yet
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6">
                    Start sharing your experiences with products to help fellow students!
                  </p>
                  <a
                    href="/"
                    className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
                  >
                    🛍️ Browse Products
                  </a>
                </div>
              </div>
            )}

            {/* Quick Actions - MOBILE RESPONSIVE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8 md:mb-12">
              <a
                href="/wishlist"
                className="bg-student-card hover:bg-student-light border border-border-light rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-student-orange/20 group-hover:bg-student-orange/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-primary">
                      💖 My Wishlist
                    </p>
                    <p className="text-xs text-student-secondary truncate">
                      {data.stats.wishlist_count > 0 ? `${data.stats.wishlist_count} items` : 'Start saving'}
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="/profile"
                className="bg-student-card hover:bg-student-light border border-border-light rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-student-blue/20 group-hover:bg-student-blue/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-primary">
                      👤 Edit Profile
                    </p>
                    <p className="text-xs text-student-secondary truncate">
                      Update your info
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="/"
                className="bg-student-card hover:bg-student-light border border-border-light rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-student-green/20 group-hover:bg-student-green/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-primary">
                      🛍️ Browse
                    </p>
                    <p className="text-xs text-student-secondary truncate">
                      Discover items
                    </p>
                  </div>
                </div>
              </a>

              <a
                href="/search"
                className="bg-student-card hover:bg-student-light border border-border-light rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-lg group"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-warning/20 group-hover:bg-warning/30 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-student-primary">
                      🔍 Search
                    </p>
                    <p className="text-xs text-student-secondary truncate">
                      Find products
                    </p>
                  </div>
                </div>
              </a>
            </div>

            {/* Welcome Message - MOBILE RESPONSIVE */}
            <div className="bg-gradient-to-r from-student-blue to-student-green rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 break-words">
                    {data.stats.total_reviews > 0 
                      ? '🎯 Keep Contributing to the Community!' 
                      : '🎉 Welcome to Your StudentStore Dashboard!'}
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg opacity-90 mb-3 sm:mb-4 md:mb-6 leading-relaxed">
                    {data.stats.total_reviews > 0 
                      ? `Amazing! You've written ${data.stats.total_reviews} review${data.stats.total_reviews > 1 ? 's' : ''} and saved ${data.stats.wishlist_count} product${data.stats.wishlist_count > 1 ? 's' : ''}. Your contributions matter!`
                      : 'Your personalized dashboard is ready! Start exploring products, build your wishlist, and share your experiences.'
                    }
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <a
                      href="/"
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg sm:rounded-xl font-medium transition-all duration-200 backdrop-blur-sm hover:scale-105 text-xs sm:text-sm md:text-base text-center"
                    >
                      {data.stats.wishlist_count > 0 ? '🛍️ Continue Shopping' : '🚀 Start Exploring'}
                    </a>
                    <a
                      href="/profile"
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-student-blue hover:bg-gray-100 rounded-lg sm:rounded-xl font-medium transition-all duration-200 hover:scale-105 text-xs sm:text-sm md:text-base text-center"
                    >
                      👤 Complete Profile
                    </a>
                  </div>
                </div>
                
                <div className="text-center md:text-right flex-shrink-0">
                  <div className="text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2">🎓</div>
                  <div className="text-xs sm:text-sm opacity-75">Student Level</div>
                  <div className="font-bold text-xs sm:text-sm md:text-base">
                    {studentLevel.level}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Achievements Tab - MOBILE RESPONSIVE */}
        {activeTab === 'achievements' && (
          <div className="space-y-6 sm:space-y-8">
            {data.achievement_badges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {data.achievement_badges.map((badge) => (
                  <div key={badge.id} className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-4 sm:p-6 border border-border-light hover:shadow-2xl transition-all duration-300">
                    <div className="text-center">
                      <div className="text-3xl sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4">
                        {badge.icon}
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-student-primary mb-1 sm:mb-2">
                        {badge.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-student-secondary mb-2 sm:mb-3 md:mb-4">
                        {badge.description}
                      </p>
                      {badge.earned_date && (
                        <div className="bg-student-green/20 text-student-green px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium inline-block">
                          🎉 Earned {formatDate(badge.earned_date)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-8 sm:p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
                  <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 md:mb-6">
                    🏆
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4">
                    No Achievements Yet
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-4 sm:mb-6 md:mb-8 leading-relaxed">
                    Start exploring products, writing reviews, and building your wishlist to earn your first achievements!
                  </p>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-student-blue/10 border border-student-blue/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                      <h4 className="font-semibold text-student-blue mb-1 sm:mb-2 text-xs sm:text-sm md:text-base">
                        🌟 How to Earn Achievements:
                      </h4>
                      <ul className="text-xs sm:text-sm text-student-primary text-left space-y-0.5 sm:space-y-1">
                        <li>• Write your first product review</li>
                        <li>• Save 10 products to your wishlist</li>
                        <li>• Write 5 detailed reviews</li>
                        <li>• Maintain a high average rating</li>
                      </ul>
                    </div>
                    <a
                      href="/"
                      className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
                    >
                      🚀 Start Exploring
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
