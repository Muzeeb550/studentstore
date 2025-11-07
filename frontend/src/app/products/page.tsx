'use client';

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
  rating_average?: number;
  review_count?: number;
  views_count?: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  product_count?: number;
}

interface ProductsPageData {
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

// 🚀 Cache management types
interface CacheData {
  data: ProductsPageData;
  timestamp: number;
}

type SortOption = 'newest' | 'oldest' | 'popular' | 'rating' | 'reviews' | 'trending';
type ViewMode = 'grid' | 'list';

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const pageParam = searchParams.get('page') || '1';
  const sortParam = (searchParams.get('sort') || 'newest') as SortOption;
  const categoryParam = searchParams.get('category') || 'all';
  
  const [data, setData] = useState<ProductsPageData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(parseInt(pageParam));
  const [sortBy, setSortBy] = useState<SortOption>(sortParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // 🚀 Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    pagination: false,
    sorting: false,
    filtering: false
  });

  // 🚀 Adaptive pagination based on screen size
  const productsPerPage = useMemo(() => {
    if (typeof window === 'undefined') return 50;
    const width = window.innerWidth;
    if (width < 640) return 20;  // Mobile
    if (width < 1024) return 30; // Tablet
    return 50; // Desktop
  }, []);

  // 🚀 Cache configuration (5 minutes like other pages)
  const CACHE_CONFIG = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxCacheSize: 50,
  };

  useEffect(() => {
    initializeProductsPage();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      fetchProducts();
    }
  }, [currentPage, sortBy, selectedCategory, productsPerPage]);

  // 🚀 Smart refresh interval
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentPage, sortBy, selectedCategory]);

  // 🚀 Initialize with smart caching
  const initializeProductsPage = async () => {
    try {
      const cachedData = loadFromCache();
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setLoadingStates({ initial: false, pagination: false, sorting: false, filtering: false });
        console.log(`🚀 Products page loaded from cache`);
        
        const age = Date.now() - getCacheTimestamp();
        if (age > 120000) { // 2 minutes
          await fetchProducts(false);
        }
      } else {
        await fetchProducts(true);
      }
    } catch (error) {
      console.error('Products page initialization error:', error);
      await fetchProducts(true);
    }
  };

  // 🚀 Fetch categories
  const fetchCategories = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/public/categories`);
      const result = await response.json();
      
      if (result.status === 'success') {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // 🚀 Load from cache
  const loadFromCache = (): ProductsPageData | null => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_CONFIG.ttl) {
          console.log(`📊 Cache hit for products page (age: ${Math.floor(age/1000)}s)`);
          return data;
        } else {
          localStorage.removeItem(cacheKey);
          console.log(`⏰ Cache expired for products page`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache loading error:', error);
      return null;
    }
  };

  // 🚀 Save to cache
  const saveToCache = (productsData: ProductsPageData) => {
    try {
      const cacheKey = getCacheKey();
      const cacheData: CacheData = {
        data: productsData,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      cleanupOldCache();
      console.log(`💾 Cached products page`);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  // 🚀 Generate cache key
  const getCacheKey = (): string => {
    return `studentstore_products_p${currentPage}_${sortBy}_cat${selectedCategory}_limit${productsPerPage}`;
  };

  // 🚀 Get cache timestamp
  const getCacheTimestamp = (): number => {
    try {
      const cacheKey = getCacheKey();
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        return timestamp;
      }
    } catch (error) {
      console.error('Cache timestamp error:', error);
    }
    return 0;
  };

  // 🚀 Clean up old cache
  const cleanupOldCache = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('studentstore_products_')) {
          keys.push(key);
        }
      }
      
      const cacheEntries = keys.map(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const { timestamp } = JSON.parse(data);
          return { key, timestamp };
        }
        return null;
      }).filter(Boolean) as Array<{ key: string; timestamp: number }>;
      
      if (cacheEntries.length > CACHE_CONFIG.maxCacheSize) {
        cacheEntries.sort((a, b) => b.timestamp - a.timestamp);
        const toDelete = cacheEntries.slice(CACHE_CONFIG.maxCacheSize);
        
        toDelete.forEach(({ key }) => {
          localStorage.removeItem(key);
        });
        
        console.log(`🧹 Cleaned up ${toDelete.length} old cache entries`);
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  };

  // 🚀 Check and refresh expired cache
  const checkAndRefreshExpiredCache = useCallback(async () => {
    if (!data) return;
    
    const age = Date.now() - getCacheTimestamp();
    
    if (age >= CACHE_CONFIG.ttl) {
      console.log('🔄 Background refresh triggered for expired cache');
      await fetchProducts(false);
    }
  }, [data]);

  // 🚀 Force refresh
  const forceRefresh = useCallback(async () => {
    console.log(`🚀 Force refresh products page`);
    
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('studentstore_products_')) {
        keys.push(key);
      }
    }
    
    keys.forEach(key => localStorage.removeItem(key));
    await fetchProducts(false);
  }, []);

  // 🚀 Listen for admin updates
  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type } = event.detail;
      
      if (type === 'product' || type === 'category') {
        console.log('🔄 Admin update detected, refreshing products');
        forceRefresh();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [forceRefresh]);

  // 🚀 Fetch products with smart caching
  const fetchProducts = async (showMainLoading: boolean = true) => {
    try {
      if (showMainLoading) {
        setLoading(true);
        setLoadingStates({ initial: true, pagination: false, sorting: false, filtering: false });
      } else if (currentPage !== 1) {
        setLoadingStates(prev => ({ ...prev, pagination: true }));
      } else if (sortBy !== 'newest') {
        setLoadingStates(prev => ({ ...prev, sorting: true }));
      } else {
        setLoadingStates(prev => ({ ...prev, filtering: true }));
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const cacheBuster = `t=${Date.now()}&v=${Math.random().toString(36).substr(2, 9)}`;
      
      let url = `${apiUrl}/api/public/products?page=${currentPage}&limit=${productsPerPage}&sort=${sortBy}&${cacheBuster}`;
      
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }

      const response = await fetch(url, {
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      const result = await response.json();

      if (result.status === 'success') {
        const productsData = result.data;
        setData(productsData);
        setError('');
        
        saveToCache(productsData);
        console.log(`🔄 Products page updated from API`);
      } else {
        setError(result.message || 'Failed to load products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
      setLoadingStates({ initial: false, pagination: false, sorting: false, filtering: false });
    }
  };

  // 🚀 Handle page change with optimistic loading
  const handlePageChange = (page: number) => {
    const cachedData = loadFromCache();
    
    if (cachedData) {
      setData(cachedData);
      setCurrentPage(page);
      console.log(`⚡ Instant page change to ${page} (from cache)`);
    } else {
      setLoadingStates(prev => ({ ...prev, pagination: true }));
      setCurrentPage(page);
    }
    
    updateURL(page, sortBy, selectedCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🚀 Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
    updateURL(1, newSort, selectedCategory);
  };

  // 🚀 Handle category filter
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
    updateURL(1, sortBy, categoryId);
  };

  // 🚀 Update URL without page reload
  const updateURL = (page: number, sort: SortOption, category: string) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (sort !== 'newest') params.set('sort', sort);
    if (category !== 'all') params.set('category', category);
    
    const queryString = params.toString();
    const newUrl = queryString ? `/products?${queryString}` : '/products';
    
    window.history.pushState({}, '', newUrl);
  };

  // 🚀 Product grid skeleton
  const ProductGridSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-64 rounded-lg mb-4"></div>
          <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
          <div className="bg-gray-200 h-3 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  // 🚀 Cache status indicator (development only)
  const CacheStatusIndicator = () => {
    const cacheAge = getCacheTimestamp();
    const age = cacheAge ? Math.floor((Date.now() - cacheAge) / 1000) : 0;
    
    return (
      <div className="fixed bottom-16 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs z-50">
        Cache: {age > 0 ? `${age}s` : 'none'} • {productsPerPage}/page
        <button 
          onClick={forceRefresh} 
          className="ml-2 text-yellow-300 hover:text-yellow-100"
          title="Force refresh"
        >
          ↻
        </button>
      </div>
    );
  };

  if (loading && loadingStates.initial) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
            <p className="text-student-secondary font-medium">Loading all products...</p>
            <p className="text-student-secondary text-sm mt-2">Discovering the best for students</p>
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
            <button onClick={() => fetchProducts(true)} className="btn-primary">
              Try Again
            </button>
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
        <ProductGridSkeleton />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* Cache status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

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
            🛍️ All Products
          </span>
        </nav>
      </div>

      {/* Page Header */}
<section className="max-w-7xl mx-auto px-4 mb-8 lg:mb-12">
  <div className="bg-student-card rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-border-light">
    <div className="text-center mb-6 lg:mb-8">
      {/* Icon */}
      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-student-blue to-student-green rounded-xl lg:rounded-2xl mb-4 lg:mb-6 shadow-lg">
        <span className="text-2xl sm:text-3xl text-white">🛍️</span>
      </div>
      
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-student-primary mb-3 lg:mb-4 px-2">
        Browse All Products
      </h1>
      
      {/* Description */}
      <p className="text-sm sm:text-base md:text-lg lg:text-xl text-student-secondary max-w-3xl mx-auto mb-6 leading-relaxed px-2">
        Explore our complete collection of student-verified products, carefully curated to meet all your academic and lifestyle needs
      </p>
      
      {/* Stats */}
      <div className="flex items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-xs sm:text-sm flex-wrap">
        <div className="text-center">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-student-blue">
            {data.pagination.total}
          </div>
          <div className="text-student-secondary text-xs sm:text-sm">Total Products</div>
        </div>
        <div className="text-center">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-student-green">
            {categories.length}
          </div>
          <div className="text-student-secondary text-xs sm:text-sm">Categories</div>
        </div>
        <div className="text-center">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-student-orange">
            {productsPerPage}
          </div>
          <div className="text-student-secondary text-xs sm:text-sm">Per Page</div>
        </div>
      </div>
    </div>
    
    {/* Divider */}
    <div className="bg-gradient-to-r from-student-blue to-student-green h-0.5 sm:h-1 w-16 sm:w-20 lg:w-24 mx-auto rounded-full"></div>
  </div>
</section>

      {/* Filters and Controls */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 gap-4">
            
            {/* Results Info */}
            <div className="flex items-center space-x-4">
              <div className="text-student-secondary">
                Showing <span className="font-semibold text-student-primary">{data.products.length}</span> of{' '}
                <span className="font-semibold text-student-primary">{data.pagination.total}</span> products
              </div>
              <div className="h-4 w-px bg-border-light"></div>
              <div className="text-student-secondary text-sm">
                Page {data.pagination.current_page} of {data.pagination.total_pages}
              </div>
              
              {/* Loading indicators */}
              {(loadingStates.pagination || loadingStates.sorting || loadingStates.filtering) && (
                <>
                  <div className="h-4 w-px bg-border-light"></div>
                  <div className="flex items-center text-student-blue text-sm">
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-2"></div>
                    {loadingStates.pagination ? 'Loading...' : 
                     loadingStates.sorting ? 'Sorting...' : 'Filtering...'}
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
              {/* Category Filter */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  disabled={loadingStates.filtering}
                  className="w-full appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200 disabled:opacity-50"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.product_count ? `(${cat.product_count})` : ''}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  {loadingStates.filtering ? (
                    <div className="animate-spin h-4 w-4 border border-student-blue border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Sort Dropdown */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  disabled={loadingStates.sorting}
                  className="w-full appearance-none bg-student-light border border-border-light rounded-xl px-4 py-2 pr-8 text-student-primary font-medium focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-student-blue transition-all duration-200 disabled:opacity-50"
                >
                  <option value="newest">🆕 Newest First</option>
                  <option value="popular">🔥 Most Popular</option>
                  <option value="rating">⭐ Highest Rated</option>
                  <option value="reviews">💬 Most Reviewed</option>
                  <option value="trending">📈 Trending</option>
                  <option value="oldest">📅 Oldest First</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  {loadingStates.sorting ? (
                    <div className="animate-spin h-4 w-4 border border-student-blue border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
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

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        {(loadingStates.pagination || loadingStates.sorting || loadingStates.filtering) ? (
          <ProductGridSkeleton />
        ) : data.products.length > 0 ? (
          <>
            {/* Products Grid/List */}
            <div className={`${
              viewMode === 'grid' 
                ? 'product-grid'
                : 'space-y-6'
            } mb-12`}>
              {data.products.map((product) => (
                <div key={product.id} className={viewMode === 'list' ? 'w-full' : ''}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-student-card rounded-xl p-6 shadow-lg border border-border-light">
                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  
                  {/* Previous Button */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!data.pagination.has_prev || loadingStates.pagination}
                    className="flex items-center px-4 py-2 border border-border-medium rounded-xl text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex space-x-2 flex-wrap justify-center">
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
                          disabled={loadingStates.pagination}
                          className={`px-3 py-2 rounded-xl transition-all duration-200 font-medium disabled:opacity-50 ${
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
                    disabled={!data.pagination.has_next || loadingStates.pagination}
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
                  {loadingStates.pagination && (
                    <div className="flex items-center justify-center mt-2">
                      <div className="animate-spin h-4 w-4 border border-student-blue border-t-transparent rounded-full mr-2"></div>
                      <span className="text-student-blue">Loading page...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-20">
            <div className="bg-student-card rounded-2xl p-12 shadow-xl border border-border-light max-w-md mx-auto">
              <div className="text-6xl mb-6">📦</div>
              <h3 className="text-2xl font-semibold text-student-primary mb-4">No products found</h3>
              <p className="text-student-secondary mb-8 leading-relaxed">
                Try adjusting your filters or check back later for new products
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setSelectedCategory('all');
                    setSortBy('newest');
                    setCurrentPage(1);
                    updateURL(1, 'newest', 'all');
                  }}
                  className="btn-primary inline-block"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Student Shopping Tips */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="bg-gradient-to-r from-student-blue/10 to-student-green/10 rounded-2xl p-8 border border-student-blue/20">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-student-primary mb-2 flex items-center justify-center">
              🎓 Smart Shopping Tips for Students
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

// Export wrapper with Suspense boundary
export default function AllProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
            <p className="text-student-secondary font-medium">Loading products...</p>
            <p className="text-student-secondary text-sm mt-2">Preparing your shopping experience</p>
          </div>
        </div>
        <Footer />
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
