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
  rating_average: number | string;
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

type SortMode = 'newest' | 'oldest' | 'name' | 'category' | 'rating';

export default function WishlistPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<WishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
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

  // ✅ REMOVED: No longer listening for wishlist updates that cause refresh
  // This was causing the page to refresh unnecessarily

  const fetchWishlist = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('studentstore_token');
      
      if (!token) {
        setError('Please login to view your wishlist');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/wishlist?page=${page}&limit=12`, {
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

  // ✅ SUPER SMOOTH DELETION - Zero refresh, just fade out
  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      // Mark as deleting for fade animation
      setDeletingIds(prev => new Set(prev).add(productId));

      // Wait for fade animation (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));

      // Make API call
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/wishlist/remove/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        // ✅ Update UI immediately - NO REFRESH
        setData(prevData => {
          if (!prevData) return null;
          
          const updatedProducts = prevData.products.filter(p => p.id !== productId);
          const newTotal = prevData.total - 1;
          
          return {
            ...prevData,
            products: updatedProducts,
            total: newTotal,
            pagination: {
              ...prevData.pagination,
              total: newTotal,
              total_pages: Math.ceil(newTotal / prevData.pagination.per_page)
            }
          };
        });

        // Remove from deleting set
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });

        // ✅ Update navbar count WITHOUT triggering refresh
        updateNavbarWishlistCount(-1);
      } else {
        // Failed - remove loading state
        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        alert('Failed to remove item. Please try again.');
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
      alert('Failed to remove item. Please try again.');
    }
  };

  // ✅ SUPER SMOOTH CLEAR ALL - Zero refresh, instant clear
  const handleClearAllWishlist = async () => {
    if (!data?.products || data.products.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to remove all ${data.total} items from your wishlist?`)) return;
    
    try {
      setClearingAll(true);
      
      // Fade out all products
      const allIds = data.products.map(p => p.id);
      setDeletingIds(new Set(allIds));

      // Wait for fade animation
      await new Promise(resolve => setTimeout(resolve, 300));

      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      // Delete all in parallel
      const deletePromises = data.products.map(product =>
        fetch(`${apiUrl}/api/wishlist/remove/${product.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(deletePromises);

      // ✅ Clear UI immediately - NO REFRESH
      setData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          products: [],
          total: 0,
          pagination: {
            ...prevData.pagination,
            total: 0,
            total_pages: 0,
            current_page: 1
          }
        };
      });

      setDeletingIds(new Set());
      
      // ✅ Update navbar count WITHOUT triggering refresh
      updateNavbarWishlistCount(-allIds.length);

    } catch (error) {
      console.error('Error clearing wishlist:', error);
      alert('Failed to clear all items. Please try again.');
    } finally {
      setClearingAll(false);
    }
  };

  // ✅ Update navbar wishlist count without page refresh
  const updateNavbarWishlistCount = (change: number) => {
    // Dispatch custom event for navbar to update its count
    window.dispatchEvent(new CustomEvent('wishlist-count-change', { 
      detail: { change } 
    }));
  };

  const handleLoginRedirect = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const getFilteredProducts = () => {
    if (!data?.products) return [];

    let filtered = [...data.products];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        cleanCategoryName(product.category_name) === selectedCategory
      );
    }

    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'newest':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'oldest':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category_name.localeCompare(b.category_name);
        case 'rating':
          const ratingA = parseFloat(a.rating_average as any) || 0;
          const ratingB = parseFloat(b.rating_average as any) || 0;
          return ratingB - ratingA;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const cleanCategoryName = (categoryName: string): string => {
    return categoryName.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
  };

  const getUniqueCategories = () => {
    if (!data?.products) return [];
    const categories = [...new Set(data.products.map(p => cleanCategoryName(p.category_name)))];
    return categories.sort();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
            <p className="text-student-secondary font-medium">Loading your wishlist...</p>
            <p className="text-student-secondary text-sm mt-2">Finding your saved treasures</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
          <div className="text-center">
            <div className="bg-student-card rounded-2xl p-6 sm:p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">💝</div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-student-primary mb-3 sm:mb-4 px-2">
                Save Your Dream Products
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-student-secondary mb-6 sm:mb-8 leading-relaxed px-2">
                Join <span className="text-student-blue font-semibold">25,847+ students</span> who save their favorite products and never miss a great deal!
              </p>

              <div className="bg-student-light rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-left">
                <h3 className="font-semibold text-student-primary mb-3 sm:mb-4 text-center text-sm sm:text-base">🎓 Why Students Love Wishlists:</h3>
                <ul className="space-y-2 sm:space-y-3 text-student-secondary text-sm sm:text-base">
                  <li className="flex items-start">
                    <span className="text-student-green mr-2 sm:mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong>Never lose track</strong> of products you want to buy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-green mr-2 sm:mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong>Compare prices</strong> across different sources easily</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-green mr-2 sm:mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong>Share with friends</strong> for group buying decisions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-green mr-2 sm:mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span><strong>Budget planning</strong> - buy when you're ready</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleLoginRedirect}
                className="bg-gradient-to-r from-student-blue to-student-green hover:from-student-blue/90 hover:to-student-green/90 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center mx-auto w-full sm:w-auto"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="truncate">Join StudentStore Community</span>
              </button>
              <p className="text-xs sm:text-sm text-student-secondary mt-3 sm:mt-4 px-2">
                🔒 Free & secure • ⚡ Instant access • 🎓 Student-focused
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 sm:py-20">
          <div className="text-center">
            <div className="text-4xl sm:text-6xl mb-4">😕</div>
            <h1 className="text-xl sm:text-2xl font-bold text-student-primary mb-4 px-4">Oops! Something went wrong</h1>
            <p className="text-student-secondary mb-6">{error}</p>
            <button onClick={() => fetchWishlist(currentPage)} className="btn-primary px-6 py-3">
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();
  const uniqueCategories = getUniqueCategories();

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
        <nav className="flex items-center space-x-2 text-xs sm:text-sm text-student-secondary mb-4 sm:mb-6 bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-md overflow-x-auto">
          <a href="/" className="hover:text-student-blue transition-colors font-medium whitespace-nowrap flex items-center">
            <span className="hidden sm:inline">🏠 StudentStore</span>
            <span className="sm:hidden">🏠 Home</span>
          </a>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold flex items-center whitespace-nowrap">
            ❤️ <span className="hidden xs:inline ml-1">My Wishlist</span><span className="xs:hidden ml-1">Wishlist</span>
          </span>
        </nav>
      </div>

      {/* Enhanced Header */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 pb-8 sm:pb-12">
        <div className="bg-student-card rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-border-light mb-6 sm:mb-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-student-orange to-warning rounded-xl sm:rounded-2xl flex items-center justify-center sm:mr-4 mb-3 sm:mb-0 shadow-lg">
                <span className="text-xl sm:text-2xl text-white">💖</span>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-student-primary">My Wishlist</h1>
                <p className="text-xs sm:text-sm md:text-base text-student-secondary mt-1">Your personal collection of favorite products</p>
              </div>
            </div>
            
            {data && data.total > 0 ? (
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm">
                <div className="text-center bg-student-light rounded-lg px-4 py-2 sm:px-6 sm:py-3">
                  <div className="text-xl sm:text-2xl font-bold text-student-blue">{data.total}</div>
                  <div className="text-student-secondary text-xs sm:text-sm">Saved Products</div>
                </div>
                <div className="text-center bg-student-light rounded-lg px-4 py-2 sm:px-6 sm:py-3">
                  <div className="text-xl sm:text-2xl font-bold text-student-orange">
                    {(() => {
                      const productsWithRatings = data.products.filter(p => {
                        const rating = parseFloat(p.rating_average as any);
                        return !isNaN(rating) && rating > 0;
                      });
                      
                      if (productsWithRatings.length === 0) return 'N/A';
                      
                      const sum = productsWithRatings.reduce((total, p) => {
                        const rating = parseFloat(p.rating_average as any) || 0;
                        return total + rating;
                      }, 0);
                      const avgRating = sum / productsWithRatings.length;
                      
                      if (isNaN(avgRating)) return 'N/A';
                      
                      return avgRating.toFixed(1) + '⭐';
                    })()}
                  </div>
                  <div className="text-student-secondary text-xs sm:text-sm">Avg Rating</div>
                </div>
              </div>
            ) : (
              <p className="text-base sm:text-lg md:text-xl text-student-secondary px-4">Start building your collection of dream products</p>
            )}
          </div>
        </div>

        {/* Controls & Filters */}
        {data && data.products.length > 0 && (
          <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light mb-6 sm:mb-8">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none bg-student-light border border-border-light rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 pr-8 text-sm sm:text-base text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200"
                  >
                    <option value="all">All Categories ({data.total})</option>
                    {uniqueCategories.map((category) => {
                      const count = data.products.filter(p => cleanCategoryName(p.category_name) === category).length;
                      return (
                        <option key={category} value={category}>
                          {category} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative flex-1 min-w-[200px]">
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="w-full appearance-none bg-student-light border border-border-light rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 pr-8 text-sm sm:text-base text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200"
                  >
                    <option value="newest">🆕 Recently Added</option>
                    <option value="oldest">📅 Oldest First</option>
                    <option value="name">📝 Name A-Z</option>
                    <option value="category">📂 Category</option>
                    <option value="rating">⭐ Highest Rated</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {data.total > 1 && (
                <button
                  onClick={handleClearAllWishlist}
                  disabled={clearingAll}
                  className="flex items-center justify-center px-3 sm:px-4 py-2 text-sm sm:text-base text-student-orange hover:text-warning border border-student-orange/30 hover:border-warning rounded-lg sm:rounded-xl font-medium transition-all duration-200 hover:bg-student-orange/10 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto sm:ml-auto"
                >
                  {clearingAll ? (
                    <>
                      <svg className="animate-spin w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Clearing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="whitespace-nowrap">Clear All ({data.total})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Product Grid */}
        {data && filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-12">
              {filteredProducts.map((product) => (
                <div 
                  key={`wishlist-${product.wishlist_id}`} 
                  className={`relative group transition-all duration-300 ${
                    deletingIds.has(product.id) ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                >
                  <ProductCard product={product} />
                  
                  <button
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    disabled={deletingIds.has(product.id)}
                    className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-1.5 sm:p-2 rounded-full shadow-lg transition-all duration-200 z-10 opacity-90 hover:opacity-100 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove from wishlist"
                    aria-label="Remove from wishlist"
                  >
                    {deletingIds.has(product.id) ? (
                      <svg className="animate-spin w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>

                  <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-student-card/95 backdrop-blur-sm border border-border-light px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs text-student-secondary font-medium shadow-md">
                    Added {new Date(product.added_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: new Date(product.added_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </div>

                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-student-green/90 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium shadow-md max-w-[100px] truncate">
                    {cleanCategoryName(product.category_name)}
                  </div>
                </div>
              ))}
            </div>

            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light">
                <div className="flex flex-col space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
                    <button
                      onClick={() => handlePageChange(data.pagination.current_page - 1)}
                      disabled={!data.pagination.has_prev}
                      className="flex items-center justify-center px-3 sm:px-4 py-2 border border-border-medium rounded-lg sm:rounded-xl text-sm sm:text-base text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium order-1"
                    >
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 sm:pb-0 order-2 scrollbar-hide">
                      <div className="flex space-x-1 sm:space-x-2 mx-auto">
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
                              className={`min-w-[32px] sm:min-w-[36px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-sm sm:text-base flex-shrink-0 ${
                                pageNum === data.pagination.current_page
                                  ? 'bg-student-blue text-white shadow-md transform scale-105'
                                  : 'text-student-primary hover:bg-student-light border border-border-light'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePageChange(data.pagination.current_page + 1)}
                      disabled={!data.pagination.has_next}
                      className="flex items-center justify-center px-3 sm:px-4 py-2 border border-border-medium rounded-lg sm:rounded-xl text-sm sm:text-base text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium order-3"
                    >
                      Next
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-center text-xs sm:text-sm text-student-secondary">
                    Page {data.pagination.current_page} of {data.pagination.total_pages} • Showing {filteredProducts.length} of {data.total} products
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <div className="bg-student-card rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-6xl sm:text-7xl md:text-8xl mb-4 sm:mb-6">💔</div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-student-primary mb-3 sm:mb-4 px-2">
                {data?.total === 0 ? "Your wishlist is empty" : `No products found in "${selectedCategory}"`}
              </h3>
              
              <div className="space-y-4 sm:space-y-6">
                <p className="text-student-secondary text-sm sm:text-base md:text-lg leading-relaxed px-2">
                  {data?.total === 0 
                    ? "Start exploring and save products you love by clicking the ❤️ heart icon on any product card."
                    : `Try selecting a different category or clear the filter to see all ${data?.total} saved products.`
                  }
                </p>

                <div className="bg-student-blue/10 border border-student-blue/20 rounded-xl p-4 sm:p-6">
                  <h4 className="font-semibold text-student-blue mb-3 sm:mb-4 flex items-center justify-center text-sm sm:text-base">
                    💡 Pro Student Tips:
                  </h4>
                  <ul className="text-xs sm:text-sm text-student-primary space-y-2 text-left max-w-md mx-auto">
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5 flex-shrink-0">✓</span>
                      Save products while browsing to compare later
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5 flex-shrink-0">✓</span>
                      Use wishlist for budget planning and timing purchases
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5 flex-shrink-0">✓</span>
                      Share your wishlist with friends for group buying
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
                  {data?.total === 0 ? (
                    <>
                      <a href="/" className="btn-primary text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3">
                        🏠 Browse Products
                      </a>
                      <a href="/search?q=laptop" className="btn-success text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3">
                        🔍 Popular Searches
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="btn-primary text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3"
                    >
                      📂 Show All Categories
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
