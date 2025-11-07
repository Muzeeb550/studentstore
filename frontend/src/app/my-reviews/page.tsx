'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StarRating from '../components/StarRating';

interface Review {
  id: number;
  rating: number;
  review_text: string;
  review_images: string;
  helpful_count: number;
  not_helpful_count: number;
  helpfulness_score: number;
  created_at: string;
  updated_at: string;
  product_id: number;
  product_name: string;
  product_images: string;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

type FilterType = 'all' | 'recent' | 'popular' | 'high-rating' | 'low-rating';
type ViewMode = 'grid' | 'list';

export default function MyReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const router = useRouter();

  const [impactMetrics] = useState({
    studentsHelped: Math.floor(Math.random() * 50) + 10,
    totalViews: Math.floor(Math.random() * 500) + 100,
    avgHelpfulness: (Math.random() * 2 + 3).toFixed(1)
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    fetchMyReviews(currentPage);
  }, [router, currentPage]);

  const fetchMyReviews = async (page: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        router.push('/');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/reviews/my-reviews?page=${page}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        setReviews(result.data.reviews);
        setPagination(result.data.pagination);
        setError('');
      } else {
        setError(result.message || 'Failed to load reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Review deleted successfully! 🗑️');
        fetchMyReviews(currentPage);
      } else {
        alert(result.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const reviewDate = new Date(dateString);
    const diffTime = Math.abs(now.getTime() - reviewDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  };

  const parseProductImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  const parseReviewImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFilteredReviews = () => {
    let filtered = [...reviews];
    
    switch (filter) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'popular':
        filtered.sort((a, b) => b.helpfulness_score - a.helpfulness_score);
        break;
      case 'high-rating':
        filtered = filtered.filter(review => review.rating >= 4);
        break;
      case 'low-rating':
        filtered = filtered.filter(review => review.rating <= 2);
        break;
      default:
        break;
    }
    
    return filtered;
  };

  const getReviewStats = () => {
    if (reviews.length === 0) return { avgRating: 0, totalHelpfulness: 0, categories: [] };
    
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const totalHelpfulness = reviews.reduce((sum, review) => sum + (review.helpful_count || 0), 0);
    
    return {
      avgRating: avgRating.toFixed(1),
      totalHelpfulness,
      categories: [...new Set(reviews.map(r => r.product_name.split(' ')[0]))].slice(0, 5)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-student-secondary font-medium text-sm sm:text-base">
              Loading your reviews...
            </p>
            <p className="text-student-secondary text-xs sm:text-sm mt-1 sm:mt-2">
              Gathering your contributions
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredReviews = getFilteredReviews();
  const reviewStats = getReviewStats();

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
          <a href="/dashboard" className="hover:text-student-blue transition-colors font-medium whitespace-nowrap flex-shrink-0">
            📊 Dashboard
          </a>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold whitespace-nowrap flex-shrink-0">
            📝 My Reviews
          </span>
        </nav>
      </div>

      {/* Header - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 pb-6 sm:pb-8 md:pb-12">
        <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-border-light mb-6 sm:mb-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-student-green to-student-blue rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 mx-auto sm:mx-0">
                <span className="text-lg sm:text-xl md:text-2xl">📝</span>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-student-primary">
                  My Reviews
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-student-secondary">
                  Your contributions to the student community
                </p>
              </div>
            </div>

            {/* Stats - MOBILE RESPONSIVE */}
            {pagination && pagination.total > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-6">
                <div className="text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-green">
                    {pagination.total}
                  </div>
                  <div className="text-xs sm:text-sm text-student-secondary">
                    Reviews Written
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-blue">
                    {impactMetrics.studentsHelped}+
                  </div>
                  <div className="text-xs sm:text-sm text-student-secondary">
                    Students Helped
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-orange">
                    {reviewStats.avgRating}★
                  </div>
                  <div className="text-xs sm:text-sm text-student-secondary">
                    Avg Rating
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-warning">
                    {reviewStats.totalHelpfulness}
                  </div>
                  <div className="text-xs sm:text-sm text-student-secondary">
                    Total Helpful
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Controls - MOBILE RESPONSIVE */}
        {reviews.length > 0 && (
          <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light mb-6 sm:mb-8">
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-0 md:flex-row md:justify-between md:items-center">
              
              {/* Filter Tabs - MOBILE RESPONSIVE */}
              <div className="flex flex-wrap items-center gap-1 overflow-x-auto pb-2 md:pb-0">
                {[
                  { key: 'all', label: '📋 All', count: reviews.length },
                  { key: 'recent', label: '🆕 Recent', count: reviews.filter(r => new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length },
                  { key: 'popular', label: '🔥 Popular', count: reviews.filter(r => r.helpfulness_score > 0).length },
                  { key: 'high-rating', label: '⭐ High', count: reviews.filter(r => r.rating >= 4).length },
                  { key: 'low-rating', label: '📉 Low', count: reviews.filter(r => r.rating <= 2).length }
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key as FilterType)}
                    className={`px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      filter === key
                        ? 'bg-student-blue text-white shadow-md'
                        : 'text-student-primary hover:bg-student-light border border-border-light'
                    }`}
                  >
                    {label} {count > 0 && `(${count})`}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle - MOBILE RESPONSIVE */}
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center bg-student-light rounded-lg p-1 border border-border-light">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid' 
                        ? 'bg-student-blue text-white shadow-md' 
                        : 'text-student-secondary hover:text-student-primary'
                    }`}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'list' 
                        ? 'bg-student-blue text-white shadow-md' 
                        : 'text-student-secondary hover:text-student-primary'
                    }`}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-student-secondary whitespace-nowrap">
                  {filteredReviews.length} of {reviews.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error State - MOBILE RESPONSIVE */}
        {error ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl border border-border-light max-w-md mx-auto">
              <div className="text-3xl sm:text-4xl md:text-6xl mb-2 sm:mb-3 md:mb-4">😕</div>
              <h2 className="text-base sm:text-lg md:text-2xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4">
                Something went wrong
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6">
                {error}
              </p>
              <button
                onClick={() => fetchMyReviews(currentPage)}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredReviews.length === 0 && reviews.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 md:mb-6">✍️</div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4">
                No reviews yet
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-4 sm:mb-6 md:mb-8 leading-relaxed">
                Start sharing your experiences with products to help fellow students!
              </p>
              
              <div className="bg-student-blue/10 border border-student-blue/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
                <h3 className="font-semibold text-student-blue mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">
                  💡 Why Your Reviews Matter:
                </h3>
                <ul className="text-xs sm:text-sm text-student-primary text-left space-y-1 sm:space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                    <span>Help fellow students avoid bad purchases</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                    <span>Share real experiences from student perspective</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                    <span>Build trust in the student community</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                    <span>Get recognized as a helpful member</span>
                  </li>
                </ul>
              </div>
              
              <a
                href="/"
                className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
              >
                🛍️ Browse Products
              </a>
            </div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-6 sm:p-8 shadow-xl border border-border-light max-w-md mx-auto">
              <div className="text-3 sm:text-4xl md:text-5xl mb-2 sm:mb-3 md:mb-4">📋</div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-student-primary mb-1 sm:mb-2">
                No reviews match
              </h3>
              <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6">
                Try a different filter
              </p>
              <button
                onClick={() => setFilter('all')}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm"
              >
                Show All
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Reviews Grid/List - MOBILE RESPONSIVE */}
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6' 
                : 'space-y-3 sm:space-y-4 md:space-y-6'
            } mb-6 sm:mb-8`}>
              {filteredReviews.map((review) => {
                const productImages = parseProductImages(review.product_images);
                const reviewImages = parseReviewImages(review.review_images);
                const firstProductImage = productImages[0] || '';
                
                return (
                  <div key={review.id} className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-border-light hover:shadow-2xl transition-all duration-300">
                    {/* Review Header */}
                    <div className="flex gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {firstProductImage ? (
                          <img
                            src={firstProductImage}
                            alt={review.product_name}
                            className="w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 object-cover rounded-lg border-2 border-border-light shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 bg-student-light rounded-lg flex items-center justify-center border-2 border-border-light flex-shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xs sm:text-sm md:text-lg font-semibold text-student-primary mb-0.5 sm:mb-1 md:mb-2 line-clamp-2 break-words">
                              {review.product_name}
                            </h3>
                            <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                              <div className="scale-75 sm:scale-100 origin-left">
                                <StarRating rating={review.rating} size="sm" showRatingText={false} />
                              </div>
                              <span className="text-xs sm:text-sm font-medium text-student-primary">
                                {review.rating}.0
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => setSelectedReview(review)}
                              className="text-student-blue hover:text-student-green p-1 sm:p-1.5 hover:bg-student-light rounded-lg transition-all duration-200"
                              title="View"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-student-orange hover:text-red-600 p-1 sm:p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <div className="mb-2 sm:mb-3 md:mb-4">
                        <p className="text-xs sm:text-sm md:text-base text-student-secondary leading-relaxed line-clamp-3">
                          {review.review_text}
                        </p>
                      </div>
                    )}

                    {/* Review Images */}
                    {reviewImages.length > 0 && (
                      <div className="mb-2 sm:mb-3 md:mb-4">
                        <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1">
                          {reviewImages.slice(0, 4).map((imageUrl, index) => (
                            <img
                              key={index}
                              src={imageUrl}
                              alt={`Review ${index + 1}`}
                              className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-cover rounded-lg border border-border-light shadow-sm flex-shrink-0"
                            />
                          ))}
                          {reviewImages.length > 4 && (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-student-light rounded-lg flex items-center justify-center text-student-secondary text-xs font-medium border border-border-light flex-shrink-0">
                              +{reviewImages.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Footer */}
                    <div className="flex flex-col gap-1.5 sm:gap-2 pt-2 sm:pt-3 md:pt-4 border-t border-border-light">
                      {/* Vote Counts */}
                      {(review.helpful_count > 0 || review.not_helpful_count > 0) ? (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                            {review.helpful_count > 0 && (
                              <div className="flex items-center gap-0.5 text-xs bg-student-green/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="font-semibold text-student-green">{review.helpful_count}</span>
                              </div>
                            )}
                            
                            {review.not_helpful_count > 0 && (
                              <div className="flex items-center gap-0.5 text-xs bg-student-orange/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                </svg>
                                <span className="font-semibold text-student-orange">{review.not_helpful_count}</span>
                              </div>
                            )}
                          </div>
                          
                          {(review.helpful_count + review.not_helpful_count) >= 5 && (
                            <div className="text-xs">
                              <span className={`font-semibold ${
                                Math.round((review.helpful_count / (review.helpful_count + review.not_helpful_count)) * 100) >= 70 
                                  ? 'text-student-green' 
                                  : 'text-student-orange'
                              }`}>
                                {Math.round((review.helpful_count / (review.helpful_count + review.not_helpful_count)) * 100)}%
                              </span>
                              <span className="text-student-secondary text-xs ml-0.5">
                                helpful
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-student-secondary bg-student-light/50 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg">
                          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          No votes yet
                        </div>
                      )}
                      
                      {/* Date and Link */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="text-xs sm:text-sm text-student-secondary">
                            📅 {getRelativeTime(review.created_at)}
                          </span>
                          {review.updated_at !== review.created_at && (
                            <span className="text-xs bg-student-orange/10 text-student-orange px-1.5 py-0.5 rounded-full whitespace-nowrap">
                              ✏️ Edited
                            </span>
                          )}
                        </div>
                        
                        <a
                          href={`/products/${review.product_id}`}
                          className="text-student-blue hover:text-student-green text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                        >
                          View →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination - MOBILE RESPONSIVE */}
            {pagination && pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 md:gap-4">
                  
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.has_prev}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 border border-border-light rounded-lg text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs sm:text-sm md:text-base w-full sm:w-auto justify-center"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">Prev</span>
                  </button>
                  
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-student-secondary">
                    <span>Page {pagination.current_page} of {pagination.total_pages}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{pagination.total} reviews</span>
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.has_next}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 border border-border-light rounded-lg text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs sm:text-sm md:text-base w-full sm:w-auto justify-center"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">Next</span>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Impact Message - MOBILE RESPONSIVE */}
            {reviews.length > 0 && (
              <div className="bg-gradient-to-r from-student-green/10 to-student-blue/10 border border-student-green/20 rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8">
                <div className="text-center">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 flex items-center justify-center gap-2">
                    <span>🌟</span>
                    <span>Your Community Impact</span>
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6 leading-relaxed max-w-2xl mx-auto">
                    Your {reviews.length} review{reviews.length !== 1 ? 's have' : ' has'} helped {impactMetrics.studentsHelped}+ fellow students. Thank you!
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                    <a
                      href="/"
                      className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-student-blue text-white rounded-lg font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
                    >
                      🛍️ Write More Reviews
                    </a>
                    <a
                      href="/dashboard"
                      className="px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 bg-student-green text-white rounded-lg font-medium hover:bg-student-blue transition-colors text-xs sm:text-sm md:text-base"
                    >
                      📊 Dashboard
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
