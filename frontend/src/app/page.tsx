'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Slider from 'react-slick';
import Navbar from './components/Navbar';
import CategoryCard from './components/CategoryCard';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import { getRecentlyViewed } from './utils/recentlyViewed';

// Import slick carousel CSS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface Banner {
  id: number;
  name: string;
  media_url: string;
  link_url: string;
  display_order: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  product_count?: number; // 🚀 NEW: From optimized backend
}

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  rating_average?: number; // 🚀 NEW: Rating support
  review_count?: number;
  views_count?: number;
}

interface RecentlyViewed {
  product: Product;
  viewedAt: number;
}

// 🚀 NEW: Cache management types
interface CacheState {
  banners: { data: Banner[]; timestamp: number; };
  categories: { data: Category[]; timestamp: number; };
  products: { data: Product[]; timestamp: number; };
  trendingProducts: { data: Product[]; timestamp: number; };
}

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🚀 NEW: Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    banners: false,
    categories: false,
    products: false,
    trending: false
  });

  // 🚀 NEW: Cache management
  const [cacheState, setCacheState] = useState<Partial<CacheState>>({});
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  // Refs for manual navigation
  const categorySliderRef = useRef<any>(null);
  const recentlyViewedSliderRef = useRef<any>(null);
  const trendingSliderRef = useRef<any>(null);

  // 🚀 NEW: Cache configuration (matches backend TTL)
  const CACHE_CONFIG = {
    banners: 5 * 60 * 1000,      // 5 minutes (matches backend 300s)
    categories: 10 * 60 * 1000,   // 10 minutes (matches backend 600s)
    products: 5 * 60 * 1000,      // 5 minutes (matches backend 300s)
    trending: 5 * 60 * 1000,      // 5 minutes
  };

  useEffect(() => {
    initializeHomepage();
    loadRecentlyViewed();
  }, []);

  // 🚀 NEW: Smart refresh interval (checks for cache expiry)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
      loadRecentlyViewed();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [cacheState]);

  // 🚀 NEW: Initialize homepage with smart caching
  const initializeHomepage = async () => {
    try {
      const cachedData = loadFromLocalCache();
      
      if (cachedData.hasValidCache) {
        // Load from cache first for instant display
        if (cachedData.banners) setBanners(cachedData.banners);
        if (cachedData.categories) setCategories(cachedData.categories);
        if (cachedData.products) setProducts(cachedData.products);
        if (cachedData.trending) setTrendingProducts(cachedData.trending);
        setLoading(false);
        
        console.log('🚀 Homepage loaded from cache (instant display)');
      }
      
      // Always fetch fresh data in background (stale-while-revalidate)
      await fetchAndUpdateData(!cachedData.hasValidCache);
      
    } catch (error) {
      console.error('Homepage initialization error:', error);
      await fetchAndUpdateData(true);
    }
  };

  // 🚀 NEW: Load from local cache with expiry check
  const loadFromLocalCache = () => {
    try {
      const now = Date.now();
      const cached = {
        banners: null as Banner[] | null,
        categories: null as Category[] | null,
        products: null as Product[] | null,
        trending: null as Product[] | null,
        hasValidCache: false
      };

      // Check banners cache
      const bannersCache = localStorage.getItem('studentstore_cache_banners');
      if (bannersCache) {
        const { data, timestamp } = JSON.parse(bannersCache);
        if (now - timestamp < CACHE_CONFIG.banners) {
          cached.banners = data;
        }
      }

      // Check categories cache
      const categoriesCache = localStorage.getItem('studentstore_cache_categories');
      if (categoriesCache) {
        const { data, timestamp } = JSON.parse(categoriesCache);
        if (now - timestamp < CACHE_CONFIG.categories) {
          cached.categories = data;
        }
      }

      // Check products cache
      const productsCache = localStorage.getItem('studentstore_cache_products');
      if (productsCache) {
        const { data, timestamp } = JSON.parse(productsCache);
        if (now - timestamp < CACHE_CONFIG.products) {
          cached.products = data;
        }
      }

      // Check trending cache
      const trendingCache = localStorage.getItem('studentstore_cache_trending');
      if (trendingCache) {
        const { data, timestamp } = JSON.parse(trendingCache);
        if (now - timestamp < CACHE_CONFIG.trending) {
          cached.trending = data;
        }
      }

      cached.hasValidCache = !!(cached.banners && cached.categories && cached.products);
      return cached;
      
    } catch (error) {
      console.error('Cache loading error:', error);
      return { hasValidCache: false, banners: null, categories: null, products: null, trending: null };
    }
  };

  // 🚀 NEW: Enhanced data fetching with smart caching
  const fetchAndUpdateData = async (showLoading: boolean = false) => {
    if (showLoading) setLoading(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const now = Date.now();
      
      // 🚀 Cache busting for force refresh (admin updates)
      const cacheBuster = `t=${now}&v=${Math.random().toString(36).substr(2, 9)}`;

      // Parallel fetch for better performance
      const [bannerRes, categoryRes, productsRes, trendingRes] = await Promise.all([
        fetch(`${apiUrl}/api/public/banners?${cacheBuster}`, {
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`${apiUrl}/api/public/categories?${cacheBuster}`, {
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`${apiUrl}/api/public/products?limit=12&${cacheBuster}`, {
          headers: { 'Cache-Control': 'no-cache' }
        }),
        fetch(`${apiUrl}/api/public/products?limit=10&sort=trending&${cacheBuster}`, {
          headers: { 'Cache-Control': 'no-cache' }
        })
      ]);

      // Process banners
      const bannerData = await bannerRes.json();
      if (bannerData.status === 'success') {
        const bannersData = bannerData.data;
        setBanners(bannersData);
        saveToLocalCache('banners', bannersData);
        console.log('🔄 Banners updated from API');
      }

      // Process categories
      const categoryData = await categoryRes.json();
      if (categoryData.status === 'success') {
        const categoriesData = categoryData.data;
        setCategories(categoriesData);
        saveToLocalCache('categories', categoriesData);
        console.log('🔄 Categories updated from API');
      }

      // Process products
      const productsData = await productsRes.json();
      if (productsData.status === 'success') {
        const productList = productsData.data.products;
        setProducts(productList);
        saveToLocalCache('products', productList);
        console.log('🔄 Products updated from API');
      }

      // Process trending
      const trendingData = await trendingRes.json();
      if (trendingData.status === 'success') {
        const trendingList = trendingData.data.products?.slice(0, 10) || [];
        setTrendingProducts(trendingList);
        saveToLocalCache('trending', trendingList);
        console.log('🔄 Trending products updated from API');
      }

      setLastRefresh(now);
      
    } catch (error) {
      console.error('❌ Data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 NEW: Save to local cache
  const saveToLocalCache = (key: string, data: any) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(`studentstore_cache_${key}`, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Cache save error for ${key}:`, error);
    }
  };

  // 🚀 NEW: Type-safe cache refresh with specific cache keys
const checkAndRefreshExpiredCache = useCallback(async () => {
  const now = Date.now();
  const needsRefresh: Array<keyof typeof CACHE_CONFIG> = []; // Even more type-safe

  // Type-safe iteration
  (Object.keys(CACHE_CONFIG) as Array<keyof typeof CACHE_CONFIG>).forEach((key) => {
    const cached = localStorage.getItem(`studentstore_cache_${key}`);
    if (cached) {
      try {
        const parsedCache: { data: any; timestamp: number } = JSON.parse(cached);
        if (now - parsedCache.timestamp >= CACHE_CONFIG[key]) {
          needsRefresh.push(key);
        }
      } catch (error) {
        console.error(`Cache parse error for ${key}:`, error);
        needsRefresh.push(key);
      }
    }
  });

  if (needsRefresh.length > 0) {
    console.log('🔄 Refreshing expired cache for:', needsRefresh);
    await fetchAndUpdateData(false);
  }
}, []);


  // 🚀 NEW: Force refresh (for admin updates)
  const forceRefresh = useCallback(async () => {
    console.log('🚀 Force refresh triggered');
    
    // Clear all cache
    ['banners', 'categories', 'products', 'trending'].forEach(key => {
      localStorage.removeItem(`studentstore_cache_${key}`);
    });
    
    // Show loading states
    setLoadingStates({
      banners: true,
      categories: true,
      products: true,
      trending: true
    });

    await fetchAndUpdateData(false);
    
    setLoadingStates({
      banners: false,
      categories: false,
      products: false,
      trending: false
    });
  }, []);

  // 🚀 NEW: Expose force refresh for admin actions
  useEffect(() => {
    // Listen for admin update events
    const handleAdminUpdate = (event: CustomEvent) => {
      console.log('🔄 Admin update detected:', event.detail);
      forceRefresh();
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [forceRefresh]);

  // Recently Viewed Products Management - Enhanced
  const loadRecentlyViewed = useCallback(() => {
    const recentProducts = getRecentlyViewed();
    setRecentlyViewed(recentProducts);
    console.log('📚 Loaded recently viewed products:', recentProducts.length);
  }, []);

  // Custom Arrow Components - Enhanced with loading states
  const CustomPrevArrow = ({ onClick }: any) => (
    <button
      onClick={onClick}
      className="absolute top-1/2 left-2 z-20 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-200 hover:shadow-2xl hover:scale-110 transition-all duration-200 flex items-center justify-center group hover:bg-student-blue"
      aria-label="Previous"
    >
      <svg className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  const CustomNextArrow = ({ onClick }: any) => (
    <button
      onClick={onClick}
      className="absolute top-1/2 right-2 z-20 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-200 hover:shadow-2xl hover:scale-110 transition-all duration-200 flex items-center justify-center group hover:bg-student-blue"
      aria-label="Next"
    >
      <svg className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  // Banner carousel settings - Enhanced
  const bannerSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    pauseOnHover: true,
    dotsClass: "slick-dots custom-dots",
  };

  // Product carousel settings - Enhanced
  const productCarouselSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 2,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1280,
        settings: { slidesToShow: 3, slidesToScroll: 1 },
      },
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2, slidesToScroll: 1 },
      },
      {
        breakpoint: 640,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  // Category slider settings - Enhanced
  const categorySettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 2,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1280,
        settings: { slidesToShow: 4, slidesToScroll: 1 },
      },
      {
        breakpoint: 1024,
        settings: { slidesToShow: 3, slidesToScroll: 1 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2, slidesToScroll: 1 },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  // 🚀 NEW: Enhanced loading component
  const LoadingSection = ({ title }: { title: string }) => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
        ))}
      </div>
    </div>
  );

  // 🚀 NEW: Cache status indicator (for debugging)
  const CacheStatusIndicator = () => {
    const cacheAge = lastRefresh ? Math.floor((Date.now() - lastRefresh) / 1000) : 0;
    
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs z-50">
        Cache: {cacheAge}s ago
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

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page flex items-center justify-center">
        <div className="text-center">
          <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
          <p className="text-student-secondary font-medium">Loading StudentStore...</p>
          <p className="text-student-secondary text-sm mt-2">Setting up your personalized experience</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      {/* 1. Navbar */}
      <Navbar />

      {/* 🚀 NEW: Cache status indicator (remove in production) */}
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

      {/* 2. Banner Carousel - Enhanced with loading states */}
      <section className="relative max-w-7xl mx-auto mt-8 px-4">
        <div className="rounded-2xl overflow-hidden shadow-2xl relative">
          {loadingStates.banners ? (
            <div className="animate-pulse bg-gray-200 h-64 md:h-80 lg:h-96 xl:h-[500px] rounded-2xl"></div>
          ) : banners.length > 0 ? (
            <Slider {...bannerSettings}>
              {banners.map((banner) => (
                <div key={banner.id} className="relative">
                  <a
                    href={banner.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative"
                  >
                    {banner.media_url.includes('.mp4') || banner.media_url.includes('.webm') ? (
                      <video
                        src={banner.media_url}
                        autoPlay
                        muted
                        loop
                        className="w-full h-64 md:h-80 lg:h-96 xl:h-[500px] object-cover"
                      />
                    ) : (
                      <img
                        src={banner.media_url}
                        alt={banner.name}
                        className="w-full h-64 md:h-80 lg:h-96 xl:h-[500px] object-cover"
                        loading="eager" // Priority loading for banners
                      />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
                      <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                        {banner.name}
                      </h2>
                      <button className="btn-action inline-flex items-center">
                        Shop Now
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    </div>
                  </a>
                </div>
              ))}
            </Slider>
          ) : (
            <div className="bg-student-hero h-64 md:h-80 lg:h-96 flex items-center justify-center rounded-2xl">
              <div className="text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome to StudentStore</h2>
                <p className="text-xl opacity-90">Your personal shopping companion for student life</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Recently Visited Products - Enhanced */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto mt-16 px-4">
          <div className="mb-8">
            <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-2">
              Continue with these so you won't miss
            </h3>
            <p className="text-student-secondary text-lg">Pick up where you left off - don't lose these great finds!</p>
          </div>
          
          <div className="relative">
            <Slider {...productCarouselSettings}>
              {recentlyViewed.map((item) => (
                <div key={`recent-${item.product.id}-${item.viewedAt}`} className="px-2">
                  <ProductCard product={item.product} />
                </div>
              ))}
            </Slider>
          </div>
        </section>
      )}

      {/* 4. Trending Popular Products - Enhanced */}
      {trendingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto mt-16 px-4">
          <div className="mb-8">
            <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-2">
              🔥 Trending Among Students
            </h3>
            <p className="text-student-secondary text-lg">What students are buying right now - join the trend!</p>
          </div>
          
          {loadingStates.trending ? (
            <LoadingSection title="Trending Products" />
          ) : (
            <div className="relative">
              <Slider {...productCarouselSettings}>
                {trendingProducts.map((product) => (
                  <div key={`trending-${product.id}`} className="px-2">
                    <ProductCard product={product} />
                  </div>
                ))}
              </Slider>
            </div>
          )}
        </section>
      )}

      {/* 5. Category Cards - Enhanced */}
      <section className="max-w-7xl mx-auto mt-16 px-4">
        <div className="mb-8">
          <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-2">Shop by Category</h3>
          <p className="text-student-secondary text-lg">Find exactly what you need for your student life</p>
        </div>
        
        {loadingStates.categories ? (
          <LoadingSection title="Categories" />
        ) : categories.length > 0 ? (
          <div className="relative">
            <Slider {...categorySettings}>
              {categories.map((category) => (
                <div key={category.id} className="px-2">
                  <CategoryCard category={category} />
                </div>
              ))}
            </Slider>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: '📚', name: 'Textbooks', desc: 'New & used books' },
              { icon: '💻', name: 'Electronics', desc: 'Laptops & gadgets' },
              { icon: '✏️', name: 'Stationery', desc: 'Pens & notebooks' },
              { icon: '🎒', name: 'Campus Gear', desc: 'Backpacks & more' },
              { icon: '📖', name: 'Courses', desc: 'Online learning' },
            ].map((category, index) => (
              <div key={index} className="category-card">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h4 className="font-semibold text-student-primary mb-1">{category.name}</h4>
                <p className="text-sm text-student-secondary">{category.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Featured Products - Enhanced */}
      <section className="max-w-7xl mx-auto mt-16 px-4">
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-4">
            Featured Products
          </h3>
          <p className="text-student-secondary text-lg max-w-2xl mx-auto">
            Handpicked products that students love, with the best deals and reviews
          </p>
        </div>
        
        {loadingStates.products ? (
          <LoadingSection title="Featured Products" />
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h4 className="text-xl font-semibold text-student-primary mb-2">No products available</h4>
            <p className="text-student-secondary">Check back soon for amazing student deals!</p>
          </div>
        )}
      </section>

      {/* 7. Footer */}
      <Footer />
    </div>
  );
}
