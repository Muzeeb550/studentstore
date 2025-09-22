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

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'oldest' | 'name' | 'category' | 'rating';

export default function WishlistPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<WishlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  // Listen for wishlist updates from other components
  useEffect(() => {
    const handleWishlistUpdate = () => {
      if (user) {
        fetchWishlist(currentPage);
      }
    };

    window.addEventListener('wishlist-updated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistUpdate);
    };
  }, [user, currentPage]);

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
        // Trigger global wishlist update
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleClearAllWishlist = async () => {
    if (!window.confirm('Are you sure you want to remove all items from your wishlist?')) return;
    
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      // Remove all items one by one (if API doesn't support bulk delete)
      if (data?.products) {
        for (const product of data.products) {
          await handleRemoveFromWishlist(product.id);
        }
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error);
    }
  };

  const handleLoginRedirect = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  const getFilteredProducts = () => {
    if (!data?.products) return [];

    let filtered = [...data.products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category_name === selectedCategory);
    }

    // Sort products
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
          return (b.rating_average || 0) - (a.rating_average || 0);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getUniqueCategories = () => {
    if (!data?.products) return [];
    const categories = [...new Set(data.products.map(p => p.category_name))];
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

  // Not logged in state - Enhanced
  if (!user) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-8xl mb-6">💝</div>
              <h1 className="text-4xl font-bold text-student-primary mb-4">
                Save Your Dream Products
              </h1>
              <p className="text-xl text-student-secondary mb-8 leading-relaxed">
                Join <span className="text-student-blue font-semibold">25,847+ students</span> who save their favorite products and never miss a great deal!
              </p>

              {/* Benefits List */}
              <div className="bg-student-light rounded-xl p-6 mb-8 text-left">
                <h3 className="font-semibold text-student-primary mb-4 text-center">🎓 Why Students Love Wishlists:</h3>
                <ul className="space-y-3 text-student-secondary">
                  <li className="flex items-start">
                    <span className="text-student-green mr-3 mt-0.5">✓</span>
                    <span><strong>Never lose track</strong> of products you want to buy</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-green mr-3 mt-0.5">✓</span>
                    <span><strong>Compare prices</strong> across different sources easily</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-green mr-3 mt-0.5">✓</span>
                    <span><strong>Share with friends</strong> for group buying decisions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-green mr-3 mt-0.5">✓</span>
                    <span><strong>Budget planning</strong> - buy when you're ready</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleLoginRedirect}
                className="bg-gradient-to-r from-student-blue to-student-green hover:from-student-blue/90 hover:to-student-green/90 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center mx-auto"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Join StudentStore Community
              </button>
              <p className="text-sm text-student-secondary mt-4">
                🔒 Free & secure • ⚡ Instant access • 🎓 Student-focused
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state - Enhanced
  if (error) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Oops! Something went wrong</h1>
            <p className="text-student-secondary mb-6">{error}</p>
            <button onClick={() => fetchWishlist(currentPage)} className="btn-primary">
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
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <nav className="flex items-center space-x-2 text-sm text-student-secondary mb-6 bg-student-card rounded-xl p-4 shadow-md">
          <a href="/" className="hover:text-student-blue transition-colors font-medium">
            🏠 StudentStore
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold flex items-center">
            ❤️ My Wishlist
          </span>
        </nav>
      </div>

      {/* Enhanced Header */}
      <section className="max-w-7xl mx-auto px-4 pb-12">
        <div className="bg-student-card rounded-2xl p-8 shadow-xl border border-border-light mb-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-student-orange to-warning rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <span className="text-2xl text-white">💖</span>
              </div>
              <div className="text-left">
                <h1 className="text-4xl md:text-5xl font-bold text-student-primary">My Wishlist</h1>
                <p className="text-student-secondary">Your personal collection of favorite products</p>
              </div>
            </div>
            
            {data && data.total > 0 ? (
              <div className="flex justify-center items-center space-x-8 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-student-blue">{data.total}</div>
                  <div className="text-student-secondary">Saved Products</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-student-green">{uniqueCategories.length}</div>
                  <div className="text-student-secondary">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-student-orange">
                    {data.products.reduce((sum, p) => sum + (p.rating_average || 0), 0) / data.products.length || 0 > 0 
                      ? (data.products.reduce((sum, p) => sum + (p.rating_average || 0), 0) / data.products.length).toFixed(1) 
                      : 'N/A'}
                  </div>
                  <div className="text-student-secondary">Avg Rating</div>
                </div>
              </div>
            ) : (
              <p className="text-xl text-student-secondary">Start building your collection of dream products</p>
            )}
          </div>
        </div>

        {/* Controls & Filters - Enhanced */}
        {data && data.products.length > 0 && (
          <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light mb-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
              
              {/* Left Controls */}
              <div className="flex flex-wrap items-center space-x-4">
                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200"
                  >
                    <option value="all">📂 All Categories</option>
                    {uniqueCategories.map((category) => (
                      <option key={category} value={category}>
                        📁 {category}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Sort Options */}
                <div className="relative">
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200"
                  >
                    <option value="newest">🆕 Recently Added</option>
                    <option value="oldest">📅 Oldest First</option>
                    <option value="name">📝 Name A-Z</option>
                    <option value="category">📂 Category</option>
                    <option value="rating">⭐ Highest Rated</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-student-light rounded-xl p-1 border border-border-light">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'grid' 
                        ? 'bg-student-blue text-white shadow-md' 
                        : 'text-student-secondary hover:text-student-primary'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      viewMode === 'list' 
                        ? 'bg-student-blue text-white shadow-md' 
                        : 'text-student-secondary hover:text-student-primary'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>

                {/* Clear All Button */}
                {data.total > 1 && (
                  <button
                    onClick={handleClearAllWishlist}
                    className="flex items-center px-4 py-2 text-student-orange hover:text-warning border border-student-orange/30 hover:border-warning rounded-xl font-medium transition-all duration-200 hover:bg-student-orange/10"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wishlist Content */}
        {data && filteredProducts.length > 0 ? (
          <>
            {/* Products Grid/List */}
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                : 'space-y-6'
              } mb-12`}>
              {filteredProducts.map((product) => (
                <div key={`wishlist-${product.wishlist_id}`} className={`relative group ${viewMode === 'list' ? 'w-full' : ''}`}>
                  <ProductCard product={product} />
                  
                  {/* Enhanced Remove Button */}
                  <button
                    onClick={() => handleRemoveFromWishlist(product.id)}
                    className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-2 rounded-full shadow-lg transition-all duration-200 z-10 opacity-90 hover:opacity-100 hover:scale-110"
                    title="Remove from wishlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  {/* Enhanced Added Date Badge */}
                  <div className="absolute bottom-3 right-3 bg-student-card/95 backdrop-blur-sm border border-border-light px-3 py-1 rounded-xl text-xs text-student-secondary font-medium shadow-md">
                    Added {new Date(product.added_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: new Date(product.added_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                    })}
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-3 right-16 bg-student-green/90 text-white px-2 py-1 rounded-full text-xs font-medium shadow-md">
                    📂 {product.category_name}
                  </div>
                </div>
              ))}
            </div>

            {/* Enhanced Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(data.pagination.current_page - 1)}
                    disabled={!data.pagination.has_prev}
                    className="flex items-center px-4 py-2 border border-border-medium rounded-xl text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
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
                          className={`px-3 py-2 rounded-xl transition-all duration-200 font-medium ${
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

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(data.pagination.current_page + 1)}
                    disabled={!data.pagination.has_next}
                    className="flex items-center px-4 py-2 border border-border-medium rounded-xl text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    Next
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Pagination Info */}
                <div className="text-center mt-4 text-sm text-student-secondary">
                  Page {data.pagination.current_page} of {data.pagination.total_pages} • Showing {filteredProducts.length} of {data.total} products
                </div>
              </div>
            )}
          </>
        ) : (
          /* Enhanced Empty Wishlist */
          <div className="text-center py-16">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-8xl mb-6">💔</div>
              <h3 className="text-3xl font-semibold text-student-primary mb-4">
                {data?.total === 0 ? "Your wishlist is empty" : `No products found in "${selectedCategory}"`}
              </h3>
              
              <div className="space-y-6">
                <p className="text-student-secondary text-lg leading-relaxed">
                  {data?.total === 0 
                    ? "Start exploring and save products you love by clicking the ❤️ heart icon on any product card."
                    : `Try selecting a different category or clear the filter to see all ${data?.total} saved products.`
                  }
                </p>

                {/* Student Tips */}
                <div className="bg-student-blue/10 border border-student-blue/20 rounded-xl p-6">
                  <h4 className="font-semibold text-student-blue mb-4 flex items-center justify-center">
                    💡 Pro Student Tips:
                  </h4>
                  <ul className="text-sm text-student-primary space-y-2 text-left max-w-md mx-auto">
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Save products while browsing to compare later
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Use wishlist for budget planning and timing purchases
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Share your wishlist with friends for group buying
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {data?.total === 0 ? (
                    <>
                      <a href="/" className="btn-primary">
                        🏠 Browse Products
                      </a>
                      <a href="/search?q=laptop" className="btn-success">
                        🔍 Popular Searches
                      </a>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="btn-primary"
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
    </div>
  );
}
