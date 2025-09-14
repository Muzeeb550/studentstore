'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';

interface User {
  id: number;
  email: string;
  role: string;
}

interface WishlistProduct {
  wishlist_id: number;
  added_at: string;
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  views_count: number;
  rating_average: number;
  review_count: number;
}

interface WishlistData {
  products: WishlistProduct[];
  total: number;
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export default function WishlistPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<WishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        fetchWishlist(1);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchWishlist = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('studentstore_token');
      
      if (!token) {
        setError('Please login to view your wishlist');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/wishlist?page=${page}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setCurrentPage(page);
        setError('');
      } else {
        setError(result.message || 'Failed to load wishlist');
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    fetchWishlist(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const response = await fetch(`http://localhost:5000/api/wishlist/remove/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.status === 'success') {
        // Refresh wishlist
        fetchWishlist(currentPage);
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleLoginRedirect = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your wishlist...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-8xl mb-6">💖</div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Save Your Favorite Products</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Sign in to create your personal wishlist and save products you love for easy access later.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleLoginRedirect}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center mx-auto"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <p className="text-sm text-gray-500">
                Join thousands of students saving their favorite products
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => fetchWishlist(currentPage)}
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
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="text-5xl mr-4">💖</div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">My Wishlist</h1>
          </div>
          {data && data.total > 0 ? (
            <p className="text-xl text-gray-600">
              You have <span className="font-semibold text-indigo-600">{data.total}</span> saved product{data.total !== 1 ? 's' : ''}
            </p>
          ) : (
            <p className="text-xl text-gray-600">Start building your collection of favorite products</p>
          )}
        </div>

        {/* Wishlist Content */}
        {data && data.products.length > 0 ? (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {data.products.map((product) => (
                <div key={product.id} className="relative">
                  <ProductCard product={product} />
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 z-10"
                    title="Remove from wishlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  {/* Added Date */}
                  <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-gray-600">
                    Added {new Date(product.added_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="flex justify-center items-center space-x-4">
                <button
                  onClick={() => handlePageChange(data.pagination.current_page - 1)}
                  disabled={!data.pagination.has_prev}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex space-x-2">
                  {Array.from({ length: Math.min(data.pagination.total_pages, 7) }, (_, i) => {
                    let pageNum;
                    if (data.pagination.total_pages <= 7) {
                      pageNum = i + 1;
                    } else {
                      const current = data.pagination.current_page;
                      const total = data.pagination.total_pages;
                      if (current <= 4) {
                        pageNum = i + 1;
                      } else if (current >= total - 3) {
                        pageNum = total - 6 + i;
                      } else {
                        pageNum = current - 3 + i;
                      }
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          pageNum === data.pagination.current_page
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(data.pagination.current_page + 1)}
                  disabled={!data.pagination.has_next}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty Wishlist */
          <div className="text-center py-16">
            <div className="text-8xl mb-6">💔</div>
            <h3 className="text-3xl font-semibold text-gray-900 mb-4">Your wishlist is empty</h3>
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-gray-600 text-lg">
                Start exploring and save products you love by clicking the heart icon on any product.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Browse Products
                </a>
                <a
                  href="/categories/1"
                  className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-xl font-medium border-2 border-gray-200 hover:border-indigo-300 transition-colors"
                >
                  View Categories
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
