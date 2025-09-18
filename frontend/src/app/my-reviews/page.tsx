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

export default function MyReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

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

      const response = await fetch(`http://localhost:5000/api/reviews/my-reviews?page=${page}&limit=12`, {
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
      const response = await fetch(`http://localhost:5000/api/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Review deleted successfully!');
        fetchMyReviews(currentPage); // Refresh reviews
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />
      
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 pt-8 pb-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex text-sm text-gray-600">
            <a href="/dashboard" className="hover:text-indigo-600">Dashboard</a>
            <span className="mx-2">→</span>
            <span className="text-gray-900 font-medium">My Reviews</span>
          </nav>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">📝 My Reviews</h1>
          <p className="text-xl text-gray-600">
            {pagination ? `${pagination.total} review${pagination.total !== 1 ? 's' : ''} written` : 'Your review history'}
          </p>
        </div>

        {error ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => fetchMyReviews(currentPage)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">✍️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No reviews yet</h2>
            <p className="text-gray-600 mb-6">Start sharing your experiences with products!</p>
            <a
              href="/"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <>
            {/* Reviews Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {reviews.map((review) => {
                const productImages = parseProductImages(review.product_images);
                const reviewImages = parseReviewImages(review.review_images);
                const firstProductImage = productImages[0] || '';
                
                return (
                  <div key={review.id} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                    {/* Review Header */}
                    <div className="flex items-start space-x-4 mb-4">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {firstProductImage ? (
                          <img
                            src={firstProductImage}
                            alt={review.product_name}
                            className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Product Info and Actions */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {review.product_name}
                            </h3>
                            <StarRating rating={review.rating} size="sm" showRatingText={true} />
                          </div>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete this review"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Review Text */}
                    {review.review_text && (
                      <div className="mb-4">
                        <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
                      </div>
                    )}

                    {/* Review Images */}
                    {reviewImages.length > 0 && (
                      <div className="mb-4">
                        <div className="grid grid-cols-3 gap-2">
                          {reviewImages.slice(0, 3).map((imageUrl, index) => (
                            <img
                              key={index}
                              src={imageUrl}
                              alt={`Review image ${index + 1}`}
                              className="w-full h-16 object-cover rounded-lg border border-gray-200"
                            />
                          ))}
                          {reviewImages.length > 3 && (
                            <div className="w-full h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                              +{reviewImages.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Review Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="text-sm text-gray-500">
                        <span>{formatDate(review.created_at)}</span>
                        {review.updated_at !== review.created_at && (
                          <span className="ml-2">• Edited</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {review.helpfulness_score > 0 && (
                          <div className="flex items-center text-sm text-gray-500">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            {review.helpfulness_score}
                          </div>
                        )}
                        
                        <a
                          href={`/products/${review.product_id}`}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          View Product →
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.has_prev}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.has_next}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
