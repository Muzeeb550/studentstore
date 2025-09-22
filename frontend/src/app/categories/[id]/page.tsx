'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import Footer from '../../components/Footer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  buy_button_2_name?: string;
  buy_button_2_url?: string;
  buy_button_3_name?: string;
  buy_button_3_url?: string;
  views_count: number;
  rating_average: number;
  review_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface CategoryPageData {
  category: Category;
  products: Product[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

type SortOption = 'newest' | 'oldest' | 'popular' | 'rating' | 'reviews';
type ViewMode = 'grid' | 'list';

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.id as string;
  
  const [data, setData] = useState<CategoryPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryProducts();
    }
  }, [categoryId, currentPage, sortBy]);

  const fetchCategoryProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/public/categories/${categoryId}/products?page=${currentPage}&limit=12&sort=${sortBy}`
      );
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load category products');
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setError('Failed to load category products');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const getSortLabel = (sort: SortOption) => {
    const labels = {
      newest: '🆕 Newest First',
      oldest: '📅 Oldest First', 
      popular: '🔥 Most Popular',
      rating: '⭐ Highest Rated',
      reviews: '💬 Most Reviewed'
    };
    return labels[sort];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
            <p className="text-student-secondary font-medium">Loading category products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Oops! Something went wrong</h1>
            <p className="text-student-secondary mb-6">{error}</p>
            <button onClick={fetchCategoryProducts} className="btn-primary">
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data || !data.category) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Category not found</h1>
            <p className="text-student-secondary mb-6">The category you're looking for doesn't exist.</p>
            <a href="/" className="btn-primary inline-block">
              Back to StudentStore
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* Enhanced Breadcrumb - StudentStore Style */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <nav className="flex items-center space-x-2 text-sm text-student-secondary mb-6 bg-student-card rounded-xl p-4 shadow-md">
          <a href="/" className="hover:text-student-blue transition-colors font-medium">
            🏠 StudentStore
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold flex items-center">
            📂 {data.category.name}
          </span>
        </nav>
      </div>

      {/* Enhanced Category Header - StudentStore Design */}
      <section className="max-w-7xl mx-auto px-4 mb-12">
        <div className="bg-student-card rounded-2xl p-8 shadow-xl border border-border-light">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-student-blue to-student-green rounded-2xl mb-6 shadow-lg">
              <span className="text-3xl text-white">📂</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-student-primary mb-4">
              {data.category.name}
            </h1>
            
            {data.category.description && (
              <p className="text-xl text-student-secondary max-w-3xl mx-auto mb-6 leading-relaxed">
                {data.category.description}
              </p>
            )}
            
            {/* Category Stats */}
            <div className="flex items-center justify-center space-x-8 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-student-blue">{data.pagination.total}</div>
                <div className="text-student-secondary">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-student-green">
                  {Math.floor(Math.random() * 1000) + 500}+
                </div>
                <div className="text-student-secondary">Students Shopping</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-student-orange">4.{Math.floor(Math.random() * 9) + 1}</div>
                <div className="text-student-secondary">Avg Rating</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-student-blue to-student-green h-1 w-24 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Enhanced Filters & Controls - StudentStore Style */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            
            {/* Results Info - Enhanced */}
            <div className="flex items-center space-x-4">
              <div className="text-student-secondary">
                Showing <span className="font-semibold text-student-primary">{data.products.length}</span> of{' '}
                <span className="font-semibold text-student-primary">{data.pagination.total}</span> products
              </div>
              <div className="h-4 w-px bg-border-light"></div>
              <div className="text-student-secondary text-sm">
                Page {data.pagination.current_page} of {data.pagination.total_pages}
              </div>
            </div>

            {/* Controls - Enhanced */}
            <div className="flex items-center space-x-4">
              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200"
                >
                  <option value="newest">🆕 Newest First</option>
                  <option value="popular">🔥 Most Popular</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="reviews">💬 Most Reviewed</option>
                  <option value="oldest">📅 Oldest First</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

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
            </div>
          </div>
        </div>
      </section>

      {/* Products Section - Enhanced */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        {data.products.length > 0 ? (
          <>
            {/* Products Grid/List */}
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8' 
                : 'space-y-6'
              } mb-12`}>
              {data.products.map((product) => (
                <div key={product.id} className={viewMode === 'list' ? 'w-full' : ''}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Enhanced Pagination - StudentStore Style */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
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
                      let page;
                      if (data.pagination.total_pages <= 7) {
                        page = i + 1;
                      } else {
                        const start = Math.max(1, currentPage - 3);
                        const end = Math.min(data.pagination.total_pages, start + 6);
                        page = start + i;
                        if (page > end) return null;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 rounded-xl transition-all duration-200 font-medium ${
                            page === currentPage
                              ? 'bg-student-blue text-white shadow-md transform scale-105'
                              : 'text-student-primary hover:bg-student-light border border-border-light'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
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
                  Page {currentPage} of {data.pagination.total_pages} • {data.pagination.total} total products
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State - Enhanced */
          <div className="text-center py-20">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-md mx-auto">
              <div className="text-6xl mb-6">📦</div>
              <h3 className="text-2xl font-semibold text-student-primary mb-4">No products found</h3>
              <p className="text-student-secondary mb-8 leading-relaxed">
                We couldn't find any products in this category yet. New products are added regularly, so check back soon!
              </p>
              <div className="space-y-3">
                <a href="/" className="btn-primary inline-block">
                  Browse Other Categories
                </a>
                <div className="text-sm text-student-secondary">
                  Or <button onClick={() => setSortBy('newest')} className="text-student-blue hover:underline">try different sorting</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Student Shopping Tips - New Section */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="bg-gradient-to-r from-student-blue/10 to-student-green/10 rounded-2xl p-8 border border-student-blue/20">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-student-primary mb-2 flex items-center justify-center">
              🎓 Smart Shopping Tips for {data.category.name}
            </h3>
            <p className="text-student-secondary">Make the most of your student budget</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-student-blue/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">💰</span>
              </div>
              <h4 className="font-semibold text-student-primary mb-2">Compare Prices</h4>
              <p className="text-sm text-student-secondary">Check multiple sources before buying</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-student-green/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">⭐</span>
              </div>
              <h4 className="font-semibold text-student-primary mb-2">Read Reviews</h4>
              <p className="text-sm text-student-secondary">Learn from other students' experiences</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-student-orange/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">📋</span>
              </div>
              <h4 className="font-semibold text-student-primary mb-2">Use Wishlist</h4>
              <p className="text-sm text-student-secondary">Save items and buy when you need them</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
