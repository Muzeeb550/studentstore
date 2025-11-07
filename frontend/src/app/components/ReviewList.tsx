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
  helpful_count: number;
  not_helpful_count: number;
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
  const [sortingLoading, setSortingLoading] = useState(false);
  
  const REVIEWS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);
  
  const [userVotes, setUserVotes] = useState<{ [reviewId: number]: string }>({});
  const [votingReviewId, setVotingReviewId] = useState<number | null>(null);
  
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalCurrentIndex, setModalCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editingReview, setEditingReview] = useState<any>(null);

  useEffect(() => {
    fetchReviews();
    
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        fetchUserVotes();
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

  useEffect(() => {
    const handleReviewUpdate = () => {
      console.log(`🔄 Review updated, refreshing reviews`);
      fetchReviews();
    };

    window.addEventListener('reviewUpdate' as any, handleReviewUpdate);
    
    return () => {
      window.removeEventListener('reviewUpdate' as any, handleReviewUpdate);
    };
  }, [productId, sortBy]);

  const fetchUserVotes = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(
        `${apiUrl}/api/reviews/votes/my-votes?productId=${productId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cache-Control': 'no-cache'
          }
        }
      );

      const result = await response.json();
      if (result.status === 'success') {
        const votesMap: { [key: number]: string } = {};
        result.data.votes.forEach((vote: any) => {
          votesMap[vote.review_id] = vote.vote_type;
        });
        setUserVotes(votesMap);
      }
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      if (sortBy !== 'newest') {
        setSortingLoading(true);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(
        `${apiUrl}/api/reviews/product/${productId}?sort=${sortBy}&limit=100&t=${Date.now()}`,
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

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setSortingLoading(true);
    setVisibleCount(REVIEWS_PER_PAGE);
    setCurrentPage(1);
  };

  const handleVote = async (reviewId: number, voteType: 'helpful' | 'not_helpful') => {
    if (!currentUser) {
      alert('Please sign in to vote on reviews');
      return;
    }

    setVotingReviewId(reviewId);

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ voteType })
      });

      const result = await response.json();

      if (result.status === 'success') {
        setReviews(prevReviews => 
          prevReviews.map(review => {
            if (review.id === reviewId) {
              const updatedReview = { ...review };
              const action = result.data.action;
              const oldVote = userVotes[reviewId];

              if (action === 'added') {
                if (voteType === 'helpful') {
                  updatedReview.helpful_count += 1;
                } else {
                  updatedReview.not_helpful_count += 1;
                }
              } else if (action === 'removed') {
                if (voteType === 'helpful') {
                  updatedReview.helpful_count = Math.max(0, updatedReview.helpful_count - 1);
                } else {
                  updatedReview.not_helpful_count = Math.max(0, updatedReview.not_helpful_count - 1);
                }
              } else if (action === 'updated') {
                if (oldVote === 'helpful') {
                  updatedReview.helpful_count = Math.max(0, updatedReview.helpful_count - 1);
                  updatedReview.not_helpful_count += 1;
                } else {
                  updatedReview.not_helpful_count = Math.max(0, updatedReview.not_helpful_count - 1);
                  updatedReview.helpful_count += 1;
                }
              }

              return updatedReview;
            }
            return review;
          })
        );

        if (result.data.action === 'removed') {
          setUserVotes(prev => {
            const newVotes = { ...prev };
            delete newVotes[reviewId];
            return newVotes;
          });
        } else {
          setUserVotes(prev => ({
            ...prev,
            [reviewId]: voteType
          }));
        }

      } else {
        alert(result.message || 'Failed to record vote');
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Failed to record vote. Please try again.');
    } finally {
      setVotingReviewId(null);
    }
  };

  const loadMore = () => {
    const newVisible = visibleCount + REVIEWS_PER_PAGE;
    setVisibleCount(newVisible);
    setCurrentPage(Math.ceil(newVisible / REVIEWS_PER_PAGE));
  };

  const showAll = () => {
    setVisibleCount(reviews.length);
    setCurrentPage(Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  };

  const jumpToPage = (pageNumber: number) => {
    const newVisible = pageNumber * REVIEWS_PER_PAGE;
    setVisibleCount(newVisible);
    setCurrentPage(pageNumber);
    
    const reviewsSection = document.getElementById('reviews-section');
    if (reviewsSection) {
      reviewsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      jumpToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    const maxPage = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
    if (currentPage < maxPage) {
      jumpToPage(currentPage + 1);
    }
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

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
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
        window.dispatchEvent(new CustomEvent('reviewUpdate', {
          detail: { productId, action: 'delete', reviewId }
        }));
        
        if (onReviewUpdate) onReviewUpdate();
        
      } else {
        setReviews(originalReviews);
        alert(result.message || 'Failed to delete review');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

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

  const visibleReviews = useMemo(() => {
    return reviews.slice(0, visibleCount);
  }, [reviews, visibleCount]);

  const paginationInfo = useMemo(() => {
    const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
    const remainingReviews = reviews.length - visibleCount;
    const startIndex = visibleCount - REVIEWS_PER_PAGE + 1;
    const endIndex = Math.min(visibleCount, reviews.length);
    
    return {
      totalPages,
      remainingReviews: Math.max(0, remainingReviews),
      hasMore: visibleCount < reviews.length,
      startIndex: Math.max(1, startIndex),
      endIndex,
      currentPage
    };
  }, [reviews.length, visibleCount, currentPage]);

  const pageNumbers = useMemo(() => {
    const { totalPages } = paginationInfo;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  }, [paginationInfo, currentPage]);

  const ReviewSkeleton = () => (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg border border-gray-100 animate-pulse">
          <div className="flex items-start gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
            <div className="bg-gray-200 w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="bg-gray-200 h-3 sm:h-4 rounded w-32 mb-1 sm:mb-2"></div>
              <div className="bg-gray-200 h-2 sm:h-3 rounded w-24"></div>
            </div>
          </div>
          <div className="bg-gray-200 h-16 sm:h-20 rounded mb-3 sm:mb-4"></div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 md:p-6 shadow-lg border border-gray-100">
          <div className="animate-pulse">
            <div className="h-5 sm:h-6 bg-gray-200 rounded w-40 sm:w-48 mb-3 sm:mb-4 md:mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
              <div className="text-center">
                <div className="h-10 sm:h-12 bg-gray-200 rounded w-16 mx-auto mb-2 sm:mb-3 md:mb-4"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
              <div className="space-y-1 sm:space-y-1.5 md:space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-2 sm:h-2.5 bg-gray-200 rounded"></div>
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
      <div className="space-y-4 sm:space-y-6 md:space-y-8" id="reviews-section">
        {/* Review Summary - MOBILE RESPONSIVE */}
        {ratingStats && (
          <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
                💬 Student Reviews
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
              <div className="text-center space-y-2 sm:space-y-3">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 break-words">
                  {ratingStats.average.toFixed(1)}
                </div>
                <div className="flex justify-center">
                  <StarRating rating={ratingStats.average} showRatingText={false} size="lg" />
                </div>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed px-2">
                  {ratingStats.total} review{ratingStats.total !== 1 ? 's' : ''} from students
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingDistribution.find(r => r.rating === star)?.count || 0;
                  const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-1 sm:px-0">
                      <span className="text-xs sm:text-sm font-medium w-4 sm:w-5 md:w-6 flex-shrink-0">
                        {star}★
                      </span>
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5 sm:h-2 md:h-2.5 min-w-0">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 w-5 sm:w-6 md:w-8 flex-shrink-0 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Sort Controls - MOBILE RESPONSIVE */}
        {reviews.length > 0 && (
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
            <div
              id="review-counter"
              className="text-xs sm:text-sm md:text-base font-semibold bg-indigo-100 text-indigo-900 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-lg border-l-4 border-indigo-600 transition-all duration-300 break-words"
            >
              📝 Showing{' '}
              <span className="font-extrabold text-indigo-600">
                {paginationInfo.startIndex}-{paginationInfo.endIndex}
              </span>
              {' '}of {reviews.length}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 md:gap-4">
              {sortingLoading && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-blue-600">
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full flex-shrink-0"></div>
                  <span className="hidden sm:inline">Sorting...</span>
                  <span className="sm:hidden">Sorting</span>
                </div>
              )}

              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                disabled={sortingLoading}
                className="w-full sm:w-auto px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 transition-all duration-200"
              >
                <option value="newest">🆕 Newest</option>
                <option value="oldest">📅 Oldest</option>
                <option value="rating_high">⭐ Highest</option>
                <option value="rating_low">⭐ Lowest</option>
                <option value="helpful">👍 Helpful</option>
              </select>
            </div>
          </div>
        )}

        {/* Error State - MOBILE RESPONSIVE */}
        {error ? (
          <div className="text-center py-8 sm:py-10 md:py-12 bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border border-red-200">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">⚠️</div>
            <p className="text-xs sm:text-sm md:text-base text-red-600 font-semibold mb-3 sm:mb-4 md:mb-6 px-3 sm:px-4">
              {error}
            </p>
            <button 
              onClick={() => fetchReviews()}
              className="px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 bg-red-500 text-white text-xs sm:text-sm md:text-base rounded-lg sm:rounded-xl hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 sm:py-10 md:py-12 bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border border-gray-100">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-2 sm:mb-3 md:mb-4">💭</div>
            <h4 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1 sm:mb-2">
              No reviews yet
            </h4>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 px-3 sm:px-4">
              Be the first student to share your experience!
            </p>
          </div>
        ) : sortingLoading ? (
          <ReviewSkeleton />
        ) : (
          <>
            {/* Reviews List - MOBILE RESPONSIVE */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {visibleReviews.map((review) => {
                const displayName = getDisplayName(review);
                const reviewImages = parseReviewImages(review.review_images);
                const isUserReview = isCurrentUserReview(review);
                const isEditing = editingReviewId === review.id;
                const userVote = userVotes[review.id];
                const isVoting = votingReviewId === review.id;
                
                if (isEditing) {
                  return (
                    <div key={review.id} className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg border border-indigo-200">
                      <div className="mb-3 sm:mb-4">
                        <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1">
                          ✏️ Edit Your Review
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          Update your review and help other students
                        </p>
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
                  <div key={review.id} className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                    {/* Review Header - MOBILE RESPONSIVE */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-1 min-w-0">
                        {review.profile_picture ? (
                          <img
                            src={review.profile_picture}
                            alt={displayName}
                            className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-indigo-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm md:text-base font-bold flex-shrink-0">
                            {getInitials(displayName)}
                          </div>
                        )}
                        
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 flex items-center flex-wrap gap-1">
                            <span className="truncate">{displayName}</span>
                            {isUserReview && (
                              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0">
                                You
                              </span>
                            )}
                          </h5>
                          <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
                            <span className="whitespace-nowrap">📅 {formatDate(review.created_at)}</span>
                            {review.is_verified_purchase && (
                              <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap">
                                ✓ Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isUserReview && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleEditReview(review)}
                            className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded-lg transition-all duration-200"
                            title="Edit"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mb-2 sm:mb-3 md:mb-4">
                      <StarRating rating={review.rating} showRatingText={false} />
                    </div>

                    {review.review_text && (
                      <div className="mb-2 sm:mb-3 md:mb-4">
                        <p className="text-xs sm:text-sm md:text-base text-gray-700 leading-relaxed">
                          {review.review_text}
                        </p>
                      </div>
                    )}

                    {reviewImages.length > 0 && (
                      <div className="mb-3 sm:mb-4 md:mb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {reviewImages.map((imageUrl, index) => (
                            <div
                              key={index}
                              className="relative cursor-pointer group"
                              onClick={() => openImageModal(reviewImages, index)}
                            >
                              <img
                                src={imageUrl}
                                alt={`Review image ${index + 1}`}
                                className="w-full h-16 sm:h-20 md:h-24 object-cover border-2 border-gray-200 hover:border-indigo-400 transition-all duration-200 rounded-lg hover:shadow-lg transform group-hover:scale-105"
                              />
                              
                              {reviewImages.length > 1 && (
                                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-1 py-0.5 rounded-full shadow-md border">
                                  {index + 1}/{reviewImages.length}
                                </div>
                              )}
                              
                              <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-white/90 backdrop-blur-sm rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <svg 
                                  className="w-2.5 h-2.5 text-gray-600" 
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

                    {/* Helpfulness Section - MOBILE RESPONSIVE */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-2 sm:pt-3 md:pt-4 border-t border-gray-100 gap-2">
                      <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
                        {!isUserReview && currentUser ? (
                          <>
                            <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">Helpful?</span>
                            <button
                              onClick={() => handleVote(review.id, 'helpful')}
                              disabled={isVoting}
                              className={`flex items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 text-xs whitespace-nowrap flex-shrink-0 ${
                                userVote === 'helpful'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600 border border-gray-200'
                              } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span className="font-medium">{review.helpful_count || 0}</span>
                            </button>
                            <button
                              onClick={() => handleVote(review.id, 'not_helpful')}
                              disabled={isVoting}
                              className={`flex items-center gap-0.5 px-2 py-1 rounded-lg transition-all duration-200 text-xs whitespace-nowrap flex-shrink-0 ${
                                userVote === 'not_helpful'
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-200'
                              } ${isVoting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                              <span className="font-medium">{review.not_helpful_count || 0}</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center whitespace-nowrap">
                              <svg className="w-3 h-3 mr-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              {review.helpful_count || 0}
                            </span>
                            <span className="flex items-center whitespace-nowrap">
                              <svg className="w-3 h-3 mr-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                              {review.not_helpful_count || 0}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {review.updated_at !== review.created_at && (
                          <span className="flex items-center whitespace-nowrap">
                            <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edited
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PAGINATION - MOBILE & DESKTOP */}
            {reviews.length > REVIEWS_PER_PAGE && (
              <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-3 sm:p-4 md:p-5 lg:p-6 shadow-lg border border-gray-100">
                {paginationInfo.hasMore && (
                  <div className="flex flex-col gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
                    <button
                      onClick={loadMore}
                      className="w-full px-4 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>📄 Load More</span>
                      {paginationInfo.remainingReviews > 0 && (
                        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs sm:text-sm">
                          {paginationInfo.remainingReviews}
                        </span>
                      )}
                    </button>
                    
                    <button
                      onClick={showAll}
                      className="w-full px-4 py-2 sm:py-2.5 md:py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-indigo-50 transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>📋 Show All</span>
                      <span className="bg-indigo-100 px-2 py-0.5 rounded-full text-xs sm:text-sm">
                        {reviews.length}
                      </span>
                    </button>
                  </div>
                )}

                {/* Mobile Pagination */}
                <div className="block md:hidden">
                  <div className="text-center mb-2">
                    <p className="text-xs text-gray-600 mb-1">
                      Page {currentPage} of {paginationInfo.totalPages}
                    </p>
                    <p className="text-xs text-gray-500">
                      {paginationInfo.startIndex}-{paginationInfo.endIndex} of {reviews.length}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Prev</span>
                    </button>

                    <div className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold min-w-[50px] text-center">
                      {currentPage}/{paginationInfo.totalPages}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= paginationInfo.totalPages}
                      className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                        currentPage >= paginationInfo.totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 active:scale-95'
                      }`}
                    >
                      <span>Next</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {paginationInfo.totalPages > 3 && (
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <label htmlFor="page-select" className="text-gray-600 whitespace-nowrap">
                        Jump:
                      </label>
                      <select
                        id="page-select"
                        value={currentPage}
                        onChange={(e) => jumpToPage(parseInt(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500"
                      >
                        {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((page) => (
                          <option key={page} value={page}>
                            Page {page}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Desktop Pagination */}
                <div className="hidden md:block">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span>Previous</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 mr-2">Jump to:</span>
                      {pageNumbers.map((page, index) => (
                        <button
                          key={index}
                          onClick={() => typeof page === 'number' && jumpToPage(page)}
                          disabled={page === '...'}
                          className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                            page === currentPage
                              ? 'bg-indigo-600 text-white shadow-lg scale-110'
                              : page === '...'
                              ? 'cursor-default text-gray-400'
                              : 'bg-gray-100 text-gray-700 hover:bg-indigo-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={goToNextPage}
                      disabled={currentPage >= paginationInfo.totalPages}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        currentPage >= paginationInfo.totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      <span>Next</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-center mt-3 text-sm text-gray-600">
                    Page {currentPage} of {paginationInfo.totalPages} • 
                    {paginationInfo.startIndex}-{paginationInfo.endIndex} of {reviews.length}
                  </div>
                </div>
              </div>
            )}
          </>
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
