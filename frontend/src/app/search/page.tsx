'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  category_id: number;
  buy_button_1_name: string;
  buy_button_1_url: string;
  views_count: number;
  rating_average: number;
  review_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  product_count: number;
}

interface SearchResultsData {
  query: string;
  results: Product[];
  total: number;
  categories: Category[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: {
    category: number | null;
    sort: string;
  };
}

type ViewMode = 'grid' | 'list';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category');
  const sortFilter = searchParams.get('sort') || 'relevance';
  const pageFilter = searchParams.get('page') || '1';
  
  const [data, setData] = useState<SearchResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Popular student searches (can be from API later)
  const popularSearches = [
    'laptop', 'textbooks', 'calculator', 'notebook', 'headphones', 
    'backpack', 'study guide', 'tablet', 'desk lamp', 'stationery'
  ];

  useEffect(() => {
    if (query.trim()) {
      fetchSearchResults();
    } else {
      setLoading(false);
      setError('Please enter a search query');
    }
  }, [query, categoryFilter, sortFilter, pageFilter]);

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      
      // Build search URL with filters
      const searchUrl = new URL('http://localhost:5000/api/public/search');
      searchUrl.searchParams.set('q', query);
      if (categoryFilter) searchUrl.searchParams.set('category', categoryFilter);
      if (sortFilter) searchUrl.searchParams.set('sort', sortFilter);
      if (pageFilter) searchUrl.searchParams.set('page', pageFilter);
      searchUrl.searchParams.set('limit', '12');

      const response = await fetch(searchUrl.toString());
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newCategory?: string, newSort?: string, newPage?: string) => {
    const url = new URL(window.location.href);
    if (newCategory !== undefined) {
      if (newCategory) {
        url.searchParams.set('category', newCategory);
      } else {
        url.searchParams.delete('category');
      }
    }
    if (newSort) url.searchParams.set('sort', newSort);
    if (newPage) {
      url.searchParams.set('page', newPage);
    } else {
      url.searchParams.delete('page');
    }
    
    window.history.pushState({}, '', url.toString());
    window.location.reload();
  };

  const handlePageChange = (page: number) => {
    updateFilters(undefined, undefined, page.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getSortLabel = (sort: string) => {
    const labels: { [key: string]: string } = {
      relevance: '🎯 Most Relevant',
      newest: '🆕 Newest First',
      oldest: '📅 Oldest First',
      name_asc: '📝 Name A-Z',
      name_desc: '📝 Name Z-A',
      rating: '⭐ Highest Rated',
      views: '👁️ Most Viewed'
    };
    return labels[sort] || sort;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
            <p className="text-student-secondary font-medium">Searching for "{query}"...</p>
            <p className="text-student-secondary text-sm mt-2">Finding the best products for students</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !query.trim()) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-6">🔍</div>
            <h1 className="text-3xl font-bold text-student-primary mb-4">Start Your StudentStore Search</h1>
            <p className="text-student-secondary mb-8 max-w-2xl mx-auto text-lg">
              Find exactly what you need for your student life - from textbooks to tech gear, all curated by fellow students
            </p>
            
            {/* Popular Searches */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-student-primary mb-4">🔥 Popular Student Searches:</h3>
              <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                {popularSearches.map((search) => (
                  <a
                    key={search}
                    href={`/search?q=${encodeURIComponent(search)}`}
                    className="bg-student-card hover:bg-student-light text-student-primary px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-border-light hover:border-student-blue hover:shadow-md"
                  >
                    {search}
                  </a>
                ))}
              </div>
            </div>

            <a href="/" className="btn-primary inline-block">
              🏠 Browse Categories
            </a>
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
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Search Error</h1>
            <p className="text-student-secondary mb-6">{error}</p>
            <a href="/" className="btn-primary inline-block">
              Back to StudentStore
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* Enhanced Search Header - StudentStore Style */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-student-secondary mb-6 bg-student-card rounded-xl p-4 shadow-md">
          <a href="/" className="hover:text-student-blue transition-colors font-medium">
            🏠 StudentStore
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold flex items-center">
            🔍 Search Results
          </span>
        </nav>

        {/* Search Results Header */}
        <div className="bg-student-card rounded-2xl p-8 shadow-xl border border-border-light mb-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-student-primary mb-4">
              Search Results
            </h1>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-student-blue to-student-green rounded-xl flex items-center justify-center">
                <span className="text-xl text-white">🔍</span>
              </div>
              <div className="text-left">
                {data.total > 0 ? (
                  <p className="text-lg text-student-primary">
                    Found <span className="font-bold text-student-green">{data.total}</span> student-verified products
                  </p>
                ) : (
                  <p className="text-lg text-student-primary">No products found</p>
                )}
                <p className="text-student-secondary">
                  for "<span className="font-semibold text-student-blue">{query}</span>"
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            {data.total > 0 && (
              <div className="flex justify-center items-center space-x-6 text-sm mt-4">
                <div className="text-center">
                  <div className="text-student-blue font-bold">{data.categories.length}</div>
                  <div className="text-student-secondary">Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-student-green font-bold">{data.pagination.total_pages}</div>
                  <div className="text-student-secondary">Pages</div>
                </div>
                <div className="text-center">
                  <div className="text-student-orange font-bold">
                    {Math.floor(Math.random() * 500 + 200)}
                  </div>
                  <div className="text-student-secondary">Students Searched</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Controls - Enhanced */}
        {data.total > 0 && (
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Left Sidebar - Category Filters */}
            <div className="lg:w-1/4">
              <div className="bg-student-card rounded-xl shadow-lg border border-border-light p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-student-primary flex items-center">
                    📂 Filter by Category
                  </h3>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden text-student-secondary hover:text-student-primary"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showFilters ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                  </button>
                </div>
                
                <div className={`space-y-2 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                  <button
                    onClick={() => updateFilters('')}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex justify-between items-center ${
                      !data.filters.category 
                        ? 'bg-student-blue text-white shadow-md' 
                        : 'text-student-primary hover:bg-student-light border border-border-light'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className="mr-2">🔗</span>
                      All Categories
                    </span>
                    <span className="text-sm opacity-75">({data.total})</span>
                  </button>
                  
                  {data.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => updateFilters(category.id.toString())}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex justify-between items-center ${
                        data.filters.category === category.id
                          ? 'bg-student-green text-white shadow-md' 
                          : 'text-student-primary hover:bg-student-light border border-border-light'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="mr-2">📂</span>
                        {category.name}
                      </span>
                      <span className="text-sm opacity-75">({category.product_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content - Results and Controls */}
            <div className="lg:w-3/4">
              {/* Top Controls Bar */}
              <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                  {/* Results Info */}
                  <div className="flex items-center space-x-4">
                    <p className="text-student-secondary">
                      Showing <span className="font-semibold text-student-primary">{data.results.length}</span> of{' '}
                      <span className="font-semibold text-student-primary">{data.total}</span> results
                    </p>
                    <div className="h-4 w-px bg-border-light"></div>
                    <p className="text-student-secondary text-sm">
                      Page {data.pagination.current_page} of {data.pagination.total_pages}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-4">
                    {/* Sort Dropdown */}
                    <div className="relative">
                      <select
                        value={data.filters.sort}
                        onChange={(e) => updateFilters(undefined, e.target.value)}
                        className="appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200"
                      >
                        <option value="relevance">🎯 Most Relevant</option>
                        <option value="newest">🆕 Newest First</option>
                        <option value="rating">⭐ Highest Rated</option>
                        <option value="views">👁️ Most Viewed</option>
                        <option value="name_asc">📝 Name A-Z</option>
                        <option value="name_desc">📝 Name Z-A</option>
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

              {/* Products Grid/List */}
              <div className={`${
                viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' 
                  : 'space-y-6'
                } mb-8`}>
                {data.results.map((product) => (
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
                    Page {data.pagination.current_page} of {data.pagination.total_pages} • {data.total} total results
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced No Results - StudentStore Style */}
        {data.total === 0 && (
          <div className="text-center py-16">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-2xl mx-auto">
              <div className="text-6xl mb-6">📭</div>
              <h3 className="text-2xl font-semibold text-student-primary mb-4">
                No products found for "{query}"
              </h3>
              
              <div className="space-y-6">
                <p className="text-student-secondary leading-relaxed">
                  We couldn't find any student-verified products matching your search. But don't worry - we're here to help!
                </p>
                
                {/* Search Suggestions */}
                <div className="bg-student-blue/10 border border-student-blue/20 rounded-xl p-6">
                  <h4 className="font-semibold text-student-blue mb-4 flex items-center justify-center">
                    💡 Try These Student Search Tips:
                  </h4>
                  <ul className="text-sm text-student-primary space-y-2 text-left max-w-md mx-auto">
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Check your spelling and try different keywords
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Use more general terms (e.g., "laptop" instead of "MacBook Pro 16")
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Browse categories to discover what's available
                    </li>
                    <li className="flex items-start">
                      <span className="text-student-green mr-2 mt-0.5">✓</span>
                      Check out trending student searches below
                    </li>
                  </ul>
                </div>

                {/* Popular Searches */}
                <div>
                  <h4 className="font-semibold text-student-primary mb-4">🔥 Popular Student Searches:</h4>
                  <div className="flex flex-wrap justify-center gap-3">
                    {popularSearches.slice(0, 6).map((search) => (
                      <a
                        key={search}
                        href={`/search?q=${encodeURIComponent(search)}`}
                        className="bg-student-light hover:bg-student-blue hover:text-white text-student-primary px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-border-light hover:border-student-blue"
                      >
                        {search}
                      </a>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href="/" className="btn-primary">
                    🏠 Browse Categories
                  </a>
                  <a href="/search" className="btn-success">
                    🔍 Try New Search
                  </a>
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
