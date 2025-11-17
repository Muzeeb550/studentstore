'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import StarRating from '../../components/StarRating';
import Link from 'next/link';
import PublicProfilePostCard from '../../components/PublicProfilePostCard';

// ===== INTERFACES =====

interface PublicUser {
  id: number;
  display_name: string;
  profile_picture: string | null;
  role: string;
  member_since: string;
  member_since_days: number;
}

interface PublicStats {
  posts_count: number;
  reviews_count: number;
  total_likes: number;
  total_dislikes: number;
  average_rating_given: number;
}

interface UserPost {
  id: number;
  product_name: string;
  product_review: string;
  product_images: string;
  product_price: string;
  buy_link: string;  // ✅ ADDED
  buy_button_text: string;  // ✅ ADDED
  likes_count: number;
  dislikes_count: number;
  created_at: string;
}


interface Review {
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

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  // ===== STATE =====
  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');

  // Posts state
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPagination, setReviewsPagination] = useState<Pagination | null>(null);

  // ===== FETCH USER PROFILE =====
  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/users/public-profile/${userId}`);
        const data = await response.json();

        if (data.status === 'success') {
          setUser(data.data.user);
          setStats(data.data.stats);
        } else {
          console.error('Failed to fetch profile:', data.message);
        }
      } catch (error) {
        console.error('Error fetching public profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPublicProfile();
    }
  }, [userId]);

  // ===== FETCH USER POSTS =====
  const fetchUserPosts = async () => {
    setPostsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/posts/user/${userId}?page=1&limit=50`);
      const data = await response.json();

      if (data.status === 'success') {
        setPosts(data.data.posts);
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // ===== FETCH USER REVIEWS =====
  const fetchUserReviews = async () => {
    setReviewsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/reviews/user/${userId}?page=1&limit=50`);
      const data = await response.json();

      if (data.status === 'success') {
        setReviews(data.data.reviews);
        setReviewsPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching user reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Fetch posts on mount
  useEffect(() => {
    if (userId && !loading) {
      fetchUserPosts();
    }
  }, [userId, loading]);

  // Fetch reviews when tab is clicked
  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0 && !loading) {
      fetchUserReviews();
    }
  }, [activeTab, loading]);

  // ===== HELPER FUNCTIONS =====
  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const parseImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  // ===== LOADING STATE =====
  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-student-secondary font-medium text-sm sm:text-base">
              Loading profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <p className="text-xl text-student-primary mb-4">User not found</p>
            <Link href="/posts" className="text-student-blue hover:underline">
              ← Back to Posts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-student-blue hover:underline">
              Home
            </Link>
            <span className="text-gray-400">›</span>
            <Link href="/posts" className="text-student-blue hover:underline">
              Posts
            </Link>
            <span className="text-gray-400">›</span>
            <span className="text-student-secondary">@{user.display_name}</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        
        {/* Header Section - NO BURGER MENU */}
        <div className="relative bg-student-card rounded-xl lg:rounded-2xl shadow-xl border border-border-light p-6 sm:p-8 mb-6">
          
          {/* Profile Picture & User Info */}
          <div className="flex flex-col items-center text-center">
            {user.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.display_name}
                className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-student-blue/20 shadow-lg mb-4"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-student-blue to-student-green rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold shadow-lg mb-4">
                {getInitials(user.display_name)}
              </div>
            )}

            {/* User Info */}
            <h1 className="text-2xl sm:text-3xl font-bold text-student-primary mb-2">
              {user.display_name}
            </h1>
            <p className="text-sm sm:text-base text-student-secondary mb-1">
              Member since {formatDate(user.member_since)} ({user.member_since_days} days)
            </p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              user.role === 'admin' 
                ? 'bg-student-orange/20 text-student-orange' 
                : 'bg-student-blue/20 text-student-blue'
            }`}>
              {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
            </span>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-student-card rounded-xl p-4 text-center border border-border-light shadow-md">
              <div className="text-2xl font-bold text-purple-600">{stats.posts_count}</div>
              <div className="text-xs text-student-secondary">Posts</div>
            </div>
            <div className="bg-student-card rounded-xl p-4 text-center border border-border-light shadow-md">
              <div className="text-2xl font-bold text-green-600">{stats.reviews_count}</div>
              <div className="text-xs text-student-secondary">Reviews</div>
            </div>
            <div className="bg-student-card rounded-xl p-4 text-center border border-border-light shadow-md">
              <div className="text-2xl font-bold text-blue-600">{stats.total_likes}</div>
              <div className="text-xs text-student-secondary">Likes</div>
            </div>
            <div className="bg-student-card rounded-xl p-4 text-center border border-border-light shadow-md">
              <div className="text-2xl font-bold text-orange-600">{stats.average_rating_given.toFixed(1)}★</div>
              <div className="text-xs text-student-secondary">Avg Rating</div>
            </div>
          </div>
        )}

        {/* Contribution Heading */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-student-primary mb-2">
            Contribution towards the Community
          </h2>
          <p className="text-sm text-student-secondary">
            {user.display_name}'s posts and reviews helping fellow students
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="bg-student-card rounded-xl shadow-lg border border-border-light p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'posts'
                  ? 'bg-student-blue text-white shadow-md'
                  : 'text-student-primary hover:bg-student-light'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <span>Posts</span>
                {posts.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {posts.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'reviews'
                  ? 'bg-student-green text-white shadow-md'
                  : 'text-student-primary hover:bg-student-light'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>Reviews</span>
                {reviewsPagination && reviewsPagination.total > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {reviewsPagination.total}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="bg-student-card rounded-xl shadow-lg border border-border-light p-4 sm:p-6">
          
          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-student-blue mx-auto mb-4"></div>
                  <p className="text-student-secondary">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-student-primary mb-2">
                    No Posts Yet
                  </h3>
                  <p className="text-student-secondary">
                    This user hasn't shared any recommendations yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <PublicProfilePostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div>
              {reviewsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-student-green mx-auto mb-4"></div>
                  <p className="text-student-secondary">Loading reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⭐</div>
                  <h3 className="text-lg font-semibold text-student-primary mb-2">
                    No Reviews Yet
                  </h3>
                  <p className="text-student-secondary">
                    This user hasn't written any reviews yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const productImages = parseImages(review.product_images);
                    const reviewImages = parseImages(review.review_images);
                    const firstProductImage = productImages[0] || '';
                    
                    return (
                      <div key={review.id} className="bg-white rounded-lg border border-border-light p-4 hover:shadow-lg transition-all duration-300">
                        {/* Review Header */}
                        <div className="flex gap-3 mb-3">
                          {/* Product Image */}
                          <div className="flex-shrink-0">
                            {firstProductImage ? (
                              <img
                                src={firstProductImage}
                                alt={review.product_name}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-border-light shadow-md"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-student-light rounded-lg flex items-center justify-center border-2 border-border-light">
                                <svg className="w-8 h-8 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base font-semibold text-student-primary mb-1 line-clamp-2">
                                  {review.product_name}
                                </h3>
                                <div className="flex items-center gap-2 mb-2">
                                  <StarRating rating={review.rating} size="sm" showRatingText={false} />
                                  <span className="text-sm font-medium text-student-primary">
                                    {review.rating}.0
                                  </span>
                                </div>
                              </div>
                              
                              {/* View Product Link */}
                              <a
                                href={`/products/${review.product_id}`}
                                className="text-student-blue hover:text-student-green p-2 hover:bg-student-light rounded-lg transition-all duration-200 flex-shrink-0"
                                title="View Product"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Review Text */}
                        {review.review_text && (
                          <div className="mb-3">
                            <p className="text-sm text-student-secondary leading-relaxed">
                              {review.review_text}
                            </p>
                          </div>
                        )}

                        {/* Review Images */}
                        {reviewImages.length > 0 && (
                          <div className="mb-3">
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {reviewImages.slice(0, 4).map((imageUrl, index) => (
                                <img
                                  key={index}
                                  src={imageUrl}
                                  alt={`Review ${index + 1}`}
                                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border-light shadow-sm flex-shrink-0"
                                />
                              ))}
                              {reviewImages.length > 4 && (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-student-light rounded-lg flex items-center justify-center text-student-secondary text-xs font-medium border border-border-light flex-shrink-0">
                                  +{reviewImages.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Review Footer */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border-light">
                          <div className="flex items-center gap-2">
                            {review.helpful_count > 0 && (
                              <div className="flex items-center gap-1 text-xs bg-student-green/10 px-2 py-1 rounded-full">
                                <svg className="w-3 h-3 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="font-semibold text-student-green">{review.helpful_count}</span>
                              </div>
                            )}
                          </div>
                          
                          <span className="text-xs text-student-secondary">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* <Footer /> */}
    </div>
  );
}
