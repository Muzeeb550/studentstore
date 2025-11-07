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

  const handleRemoveFromWishlist = async (productId: number) => {
    try {
      setDeletingIds(prev => new Set(prev).add(productId));

      await new Promise(resolve => setTimeout(resolve, 300));

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

        setDeletingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });

        updateNavbarWishlistCount(-1);
      } else {
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

  const handleClearAllWishlist = async () => {
    if (!data?.products || data.products.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to remove all ${data.total} items?`)) return;
    
    try {
      setClearingAll(true);
      
      const allIds = data.products.map(p => p.id);
      setDeletingIds(new Set(allIds));

      await new Promise(resolve => setTimeout(resolve, 300));

      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const deletePromises = data.products.map(product =>
        fetch(`${apiUrl}/api/wishlist/remove/${product.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(deletePromises);

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
      updateNavbarWishlistCount(-allIds.length);

    } catch (error) {
      console.error('Error clearing wishlist:', error);
      alert('Failed to clear all items. Please try again.');
    } finally {
      setClearingAll(false);
    }
  };

  const updateNavbarWishlistCount = (change: number) => {
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
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-student-secondary font-medium text-sm sm:text-base">
              Loading your wishlist...
            </p>
            <p className="text-student-secondary text-xs sm:text-sm mt-1 sm:mt-2">
              Finding your saved treasures
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-20">
          <div className="text-center">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 lg:p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl mb-3 sm:mb-4 md:mb-6">
                💝
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 px-2">
                Save Your Dream Products
              </h1>
              <p className="text-xs sm:text-sm md:text-base lg:text-xl text-student-secondary mb-4 sm:mb-6 md:mb-8 leading-relaxed px-2">
                Join <span className="text-student-blue font-semibold">25,847+ students</span> who save their favorite products!
              </p>

              <div className="bg-student-light rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8 text-left">
                <h3 className="font-semibold text-student-primary mb-2 sm:mb-3 md:mb-4 text-center text-xs sm:text-sm md:text-base">
                  🎓 Why Students Love Wishlists:
                </h3>
                <ul className="space-y-1.5 sm:space-y-2 md:space-y-3 text-student-secondary text-xs sm:text-sm md:text-base">
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0 text-xs sm:text-sm">✓</span>
                    <span><strong>Never lose track</strong> of products you want</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0 text-xs sm:text-sm">✓</span>
                    <span><strong>Compare prices</strong> easily</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0 text-xs sm:text-sm">✓</span>
                    <span><strong>Share with friends</strong> for group buying</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-student-green mt-0.5 flex-shrink-0 text-xs sm:text-sm">✓</span>
                    <span><strong>Budget planning</strong> - buy when ready</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleLoginRedirect}
                className="bg-gradient-to-r from-student-blue to-student-green hover:from-student-blue/90 hover:to-student-green/90 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center mx-auto w-full sm:w-auto gap-2"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="truncate">Join StudentStore</span>
              </button>
              <p className="text-xs sm:text-sm text-student-secondary mt-2 sm:mt-3 md:mt-4 px-2">
                🔒 Free • ⚡ Instant • 🎓 Student-focused
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-20">
          <div className="text-center">
            <div className="text-3 sm:text-4xl md:text-6xl mb-2 sm:mb-3 md:mb-4">😕</div>
            <h1 className="text-base sm:text-lg md:text-2xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 px-2">
              Oops! Something went wrong
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-3 sm:mb-4 md:mb-6">
              {error}
            </p>
            <button
              onClick={() => fetchWishlist(currentPage)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg sm:rounded-xl font-medium hover:bg-student-green transition-colors text-xs sm:text-sm md:text-base"
            >
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

      {/* Breadcrumb - MOBILE RESPONSIVE */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6 md:pt-8">
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-student-secondary mb-4 sm:mb-6 bg-student-card rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 shadow-md overflow-x-auto">
          <a href="/" className="hover:text-student-blue transition-colors font-medium whitespace-nowrap flex-shrink-0">
            <span className="hidden sm:inline">🏠 StudentStore</span>
            <span className="sm:hidden">🏠 Home</span>
          </a>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold whitespace-nowrap flex-shrink-0">
            ❤️ <span className="hidden sm:inline ml-1">My Wishlist</span><span className="sm:hidden ml-1">Wishlist</span>
          </span>
        </nav>
      </div>

      {/* Header - MOBILE RESPONSIVE */}
      <section className="max-w-7xl mx-auto px-3 sm:px-4 pb-6 sm:pb-8 md:pb-12">
        <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-border-light mb-6 sm:mb-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-gradient-to-br from-student-orange to-warning rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 mx-auto sm:mx-0">
                <span className="text-lg sm:text-xl md:text-2xl">💖</span>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-student-primary">
                  My Wishlist
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-student-secondary mt-1">
                  Your collection of favorite products
                </p>
              </div>
            </div>
            
            {data && data.total > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-6 max-w-md mx-auto">
                <div className="text-center bg-student-light rounded-lg px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-blue">
                    {data.total}
                  </div>
                  <div className="text-xs sm:text-sm text-student-secondary">
                    Saved
                  </div>
                </div>
                <div className="text-center bg-student-light rounded-lg px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3">
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-student-orange">
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
                  <div className="text-xs sm:text-sm text-student-secondary">
                    Avg Rating
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm sm:text-base md:text-lg text-student-secondary px-3">
                Start building your collection
              </p>
            )}
          </div>
        </div>

        {/* Controls - MOBILE RESPONSIVE */}
        {data && data.products.length > 0 && (
          <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light mb-6 sm:mb-8">
            <div className="flex flex-col gap-2 sm:gap-3">
              
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full appearance-none bg-student-light border border-border-light rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 pr-8 text-xs sm:text-sm md:text-base text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue transition-all"
                  >
                    <option value="all">All ({data.total})</option>
                    {uniqueCategories.map((category) => {
                      const count = data.products.filter(p => cleanCategoryName(p.category_name) === category).length;
                      return (
                        <option key={category} value={category}>
                          {category} ({count})
                        </option>
                      );
                    })}
                  </select>
                  <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-student-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="relative flex-1">
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="w-full appearance-none bg-student-light border border-border-light rounded-lg px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 pr-8 text-xs sm:text-sm md:text-base text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue transition-all"
                  >
                    <option value="newest">🆕 Recently</option>
                    <option value="oldest">📅 Oldest</option>
                    <option value="name">📝 Name</option>
                    <option value="category">📂 Category</option>
                    <option value="rating">⭐ Rating</option>
                  </select>
                  <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-student-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {data.total > 1 && (
                <button
                  onClick={handleClearAllWishlist}
                  disabled={clearingAll}
                  className="flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-student-orange hover:text-warning border border-student-orange/30 hover:border-warning rounded-lg font-medium transition-all hover:bg-student-orange/10 disabled:opacity-50 w-full sm:w-auto"
                >
                  {clearingAll ? (
                    <>
                      <svg className="animate-spin w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-xs">Clearing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Product Grid - MOBILE RESPONSIVE */}
        {data && filteredProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-6 sm:mb-8 md:mb-12">
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
                    className="absolute top-1.5 sm:top-2 md:top-3 left-1.5 sm:left-2 md:left-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-1 sm:p-1.5 md:p-2 rounded-full shadow-lg transition-all duration-200 z-10 opacity-90 hover:opacity-100 hover:scale-110 disabled:opacity-50"
                    title="Remove from wishlist"
                  >
                    {deletingIds.has(product.id) ? (
                      <svg className="animate-spin w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>

                  <div className="absolute bottom-1.5 sm:bottom-2 md:bottom-3 right-1.5 sm:right-2 md:right-3 bg-student-card/95 backdrop-blur-sm border border-border-light px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] md:text-xs text-student-secondary font-medium shadow-md whitespace-nowrap">
                    {new Date(product.added_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric'
                    })}
                  </div>

                  <div className="absolute top-1.5 sm:top-2 md:top-3 right-1.5 sm:right-2 md:right-3 bg-student-green/90 text-white px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-medium shadow-md truncate max-w-[80px]">
                    {cleanCategoryName(product.category_name)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination - MOBILE RESPONSIVE */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg border border-border-light">
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
                    <button
                      onClick={() => handlePageChange(data.pagination.current_page - 1)}
                      disabled={!data.pagination.has_prev}
                      className="flex items-center justify-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-border-light rounded-lg text-xs sm:text-sm text-student-primary hover:bg-student-light disabled:opacity-50 transition-all font-medium"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="hidden sm:inline">Prev</span>
                    </button>
                    
                    <div className="flex gap-1 overflow-x-auto">
                      {Array.from({ length: Math.min(data.pagination.total_pages, 5) }, (_, i) => {
                        let pageNum;
                        if (data.pagination.total_pages <= 5) {
                          pageNum = i + 1;
                        } else {
                          const current = data.pagination.current_page;
                          const total = data.pagination.total_pages;
                          if (current <= 3) {
                            pageNum = i + 1;
                          } else if (current >= total - 2) {
                            pageNum = total - 4 + i;
                          } else {
                            pageNum = current - 2 + i;
                          }
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-7 sm:w-8 md:w-9 h-7 sm:h-8 md:h-9 rounded-lg text-xs sm:text-sm transition-all font-medium flex-shrink-0 ${
                              pageNum === data.pagination.current_page
                                ? 'bg-student-blue text-white shadow-md'
                                : 'text-student-primary hover:bg-student-light border border-border-light'
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
                      className="flex items-center justify-center px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-border-light rounded-lg text-xs sm:text-sm text-student-primary hover:bg-student-light disabled:opacity-50 transition-all font-medium"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  <div className="text-center text-xs sm:text-sm text-student-secondary">
                    Page {data.pagination.current_page} of {data.pagination.total_pages} • {data.total} products
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 sm:py-12 md:py-16">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-6 sm:p-8 md:p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-4 sm:text-5xl md:text-6xl lg:text-8xl mb-3 sm:mb-4 md:mb-6">
                💔
              </div>
              <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-student-primary mb-2 sm:mb-3 md:mb-4 px-2">
                {data?.total === 0 ? "Wishlist is empty" : `No products in "${selectedCategory}"`}
              </h3>
              
              <div className="space-y-3 sm:space-y-4 md:space-y-6">
                <p className="text-xs sm:text-sm md:text-base text-student-secondary leading-relaxed px-2">
                  {data?.total === 0 
                    ? "Save products you love by clicking the ❤️ heart icon!"
                    : `Try a different category.`
                  }
                </p>

                <div className="bg-student-blue/10 border border-student-blue/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                  <h4 className="font-semibold text-student-blue mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">
                    💡 Pro Tips:
                  </h4>
                  <ul className="text-xs sm:text-sm text-student-primary space-y-1 text-left max-w-md mx-auto">
                    <li className="flex items-start gap-1.5">
                      <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                      <span>Save products while browsing</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                      <span>Use wishlist for budget planning</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-student-green mt-0.5 flex-shrink-0">✓</span>
                      <span>Share with friends for group buying</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center px-2">
                  {data?.total === 0 ? (
                    <>
                      <a href="/" className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg font-medium hover:bg-student-green transition-colors text-xs sm:text-sm text-center">
                        🏠 Browse
                      </a>
                      <a href="/search?q=laptop" className="px-4 sm:px-6 py-2 sm:py-3 bg-student-green text-white rounded-lg font-medium hover:bg-student-blue transition-colors text-xs sm:text-sm text-center">
                        🔍 Search
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-student-blue text-white rounded-lg font-medium hover:bg-student-green transition-colors text-xs sm:text-sm"
                    >
                      📂 Show All
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
