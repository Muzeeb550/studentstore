'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import StarRating from './StarRating';
import ImageModal from './ImageModal';
import ReviewForm from './ReviewForm';

interface Review {
  id: number;
  rating: number;
  review_text: string;
  review_images: string;
  is_verified_purchase: boolean;
  helpfulness_score: number;
  created_at: string;
  updated_at: string;
  name: string;
  display_name: string;
  profile_picture: string;
}

interface ReviewListProps {
  productId: number;
  onReviewUpdate?: () => void;
}

export default function ReviewList({ productId, onReviewUpdate }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({});
  
  // 🚀 SIMPLE: Only one loading state that matters
  const [sortingLoading, setSortingLoading] = useState(false);
  
  // Image modal state
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalCurrentIndex, setModalCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
    
    // Get current user from localStorage
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [sortBy]);

  // 🚀 SIMPLE: Direct event listener - no complex logic
  useEffect(() => {
    const handleReviewUpdate = () => {
      console.log(`🔄 Review updated, refreshing reviews`);
      fetchReviews(); // Just refresh, no fancy stuff
    };

    window.addEventListener('reviewUpdate' as any, handleReviewUpdate);
    
    return () => {
      window.removeEventListener('reviewUpdate' as any, handleReviewUpdate);
    };
  }, [productId, sortBy]);

  // 🚀 SIMPLE: One fetch function, no caching complexity
  const fetchReviews = async () => {
    try {
      if (sortBy !== 'newest') {
        setSortingLoading(true);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(
        `${apiUrl}/api/reviews/product/${productId}?sort=${sortBy}&limit=20&t=${Date.now()}`,
        {
          headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const result = await response.json();

      if (result.status === 'success') {
        setReviews(result.data.reviews);
        setRatingDistribution(result.data.rating_distribution);
        setPagination(result.data.pagination);
        setError('');
        console.log(`✅ Reviews loaded: ${result.data.reviews.length} reviews`);
      } else {
        setError(result.message || 'Failed to load reviews');
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
      setSortingLoading(false);
    }
  };

  // 🚀 SIMPLE: Handle sort change
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setSortingLoading(true);
  };

  const handleEditReview = (review: Review) => {
    const reviewImages = parseReviewImages(review.review_images);
    setEditingReviewId(review.id);
    setEditingReview({
      id: review.id,
      rating: review.rating,
      review_text: review.review_text,
      review_images: reviewImages
    });
  };

  // 🚀 SIMPLE: Delete review with immediate UI update
  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      // Remove from UI immediately
      const originalReviews = reviews;
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      
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
        // Dispatch event and refresh
        window.dispatchEvent(new CustomEvent('reviewUpdate', {
          detail: { productId, action: 'delete', reviewId }
        }));
        
        if (onReviewUpdate) onReviewUpdate();
        
      } else {
        // Restore on error
        setReviews(originalReviews);
        alert(result.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  // 🚀 SIMPLE: Update review
  const handleUpdateReview = async (reviewData: any) => {
    if (!editingReviewId) return;

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/reviews/${editingReviewId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        setEditingReviewId(null);
        setEditingReview(null);
        
        // Dispatch event and refresh
        window.dispatchEvent(new CustomEvent('reviewUpdate', {
          detail: { productId, action: 'update', reviewId: editingReviewId }
        }));
        
        if (onReviewUpdate) onReviewUpdate();
        
      } else {
        alert(result.message || 'Failed to update review');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Failed to update review. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditingReview(null);
  };

  const openImageModal = (images: string[], startIndex: number) => {
    setModalImages(images);
    setModalCurrentIndex(startIndex);
    setIsModalOpen(true);
  };

  const closeImageModal = () => {
    setIsModalOpen(false);
    setModalImages([]);
    setModalCurrentIndex(0);
  };

  const getDisplayName = (review: Review) => {
    return review.name || review.display_name || 'Anonymous User';
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const parseReviewImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  const isCurrentUserReview = (review: Review) => {
    if (!currentUser) return false;
    
    return (
      (currentUser.name && review.name && currentUser.name === review.name) ||
      (currentUser.display_name && review.display_name && currentUser.display_name === review.display_name) ||
      (currentUser.email && review.name && currentUser.email === review.name)
    );
  };

  // Rating stats
  const ratingStats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return null;

    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / total;
    return {
      average: avgRating,
      total: total,
      distribution: ratingDistribution
    };
  }, [reviews, ratingDistribution]);

  // Simple loading skeleton
  const ReviewSkeleton = () => (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse">
          <div className="flex items-start space-x-4 mb-4">
            <div className="bg-gray-200 w-12 h-12 rounded-full"></div>
            <div className="flex-1">
              <div className="bg-gray-200 h-4 rounded w-32 mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-24"></div>
            </div>
          </div>
          <div className="bg-gray-200 h-20 rounded mb-4"></div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="h-12 bg-gray-200 rounded w-16 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <ReviewSkeleton />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Review Summary */}
        {ratingStats && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">💬 Student Reviews</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {ratingStats.average.toFixed(1)}
                </div>
                <StarRating rating={ratingStats.average} showRatingText={false} size="lg" />
                <p className="text-gray-600 mt-2">
                  {ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''} from students
                </p>
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution.find(r => r.rating === star)?.count || 0;
                  const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                  
                  return (
                    <div key={star} className="flex items-center space-x-3">
                      <span className="text-sm font-medium w-6">{star}★</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        {reviews.length > 0 && (
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              📝 All Reviews ({reviews.length})
            </h4>
            <div className="flex items-center space-x-4">
              {sortingLoading && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2"></div>
                  <span>Sorting...</span>
                </div>
              )}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                disabled={sortingLoading}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all duration-200"
              >
                <option value="newest">🆕 Newest First</option>
                <option value="oldest">📅 Oldest First</option>
                <option value="rating_high">⭐ Highest Rating</option>
                <option value="rating_low">⭐ Lowest Rating</option>
                <option value="helpful">👍 Most Helpful</option>
              </select>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {error ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-red-200">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-red-600 font-semibold mb-4">{error}</p>
            <button 
              onClick={() => fetchReviews()}
              className="px-6 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="text-6xl mb-4">💭</div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">No reviews yet</h4>
            <p className="text-gray-600">Be the first student to share your experience with this product!</p>
          </div>
        ) : sortingLoading ? (
          <ReviewSkeleton />
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => {
              const displayName = getDisplayName(review);
              const reviewImages = parseReviewImages(review.review_images);
              const isUserReview = isCurrentUserReview(review);
              const isEditing = editingReviewId === review.id;
              
              if (isEditing) {
                return (
                  <div key={review.id} className="bg-white rounded-2xl p-6 shadow-lg border border-indigo-200">
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">✏️ Edit Your Review</h4>
                      <p className="text-sm text-gray-600">Update your review and help other students</p>
                    </div>
                    <ReviewForm
                      productId={productId}
                      productName="this product"
                      existingReview={editingReview}
                      onSubmit={handleUpdateReview}
                      onCancel={cancelEdit}
                    />
                  </div>
                );
              }
              
              return (
                <div key={review.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                  {/* Review Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      {review.profile_picture ? (
                        <img
                          src={review.profile_picture}
                          alt={displayName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {getInitials(displayName)}
                        </div>
                      )}
                      
                      <div>
                        <h5 className="font-semibold text-gray-900 flex items-center">
                          {displayName}
                          {isUserReview && (
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              You
                            </span>
                          )}
                        </h5>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>📅 {formatDate(review.created_at)}</span>
                          {review.is_verified_purchase && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                              ✓ Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isUserReview && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditReview(review)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                          title="Edit my review"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete my review"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <StarRating rating={review.rating} showRatingText={false} />
                  </div>

                  {review.review_text && (
                    <div className="mb-4">
                      <p className="text-gray-700 leading-relaxed">{review.review_text}</p>
                    </div>
                  )}

                  {reviewImages.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {reviewImages.map((imageUrl, index) => (
                          <div
                            key={index}
                            className="relative cursor-pointer group"
                            onClick={() => openImageModal(reviewImages, index)}
                          >
                            <img
                              src={imageUrl}
                              alt={`Review image ${index + 1}`}
                              className="w-full h-24 sm:h-32 object-cover border-2 border-gray-200 hover:border-indigo-400 transition-all duration-200 rounded-lg hover:shadow-lg transform group-hover:scale-105"
                            />
                            
                            {reviewImages.length > 1 && (
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-2 py-1 rounded-full shadow-md border">
                                {index + 1}/{reviewImages.length}
                              </div>
                            )}
                            
                            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200">
                              <svg 
                                className="w-3 h-3 text-gray-600" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-500">
                      {review.updated_at !== review.created_at && (
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edited on {formatDate(review.updated_at)}
                        </span>
                      )}
                    </div>
                    
                    {review.helpfulness_score > 0 && (
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.60L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {review.helpfulness_score} students found this helpful
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ImageModal
        images={modalImages}
        currentIndex={modalCurrentIndex}
        isOpen={isModalOpen}
        onClose={closeImageModal}
      />
    </>
  );
}
