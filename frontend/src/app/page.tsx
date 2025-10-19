'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Slider from 'react-slick';
import Navbar from './components/Navbar';
import CategoryCard from './components/CategoryCard';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import { getRecentlyViewed } from './utils/recentlyViewed';
import RecentlyViewedCard from './components/RecentlyViewedCard';
import TrendingCard from './components/TrendingCard';
import Link from 'next/link';
import { optimizeBannerImage, optimizeProductImage, getFirstImageOrPlaceholder } from './utils/imageOptimizer';
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
  product_count?: number;
}

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  rating_average?: number;
  review_count?: number;
  views_count?: number;
}

interface RecentlyViewed {
  product: Product;
  viewedAt: number;
}

const MAX_RECENTLY_VIEWED = 10;
const MAX_TRENDING_PRODUCTS = 10;
const MAX_FEATURED_PRODUCTS = 12;

// ✅ Cache configuration - optimized intervals
const CACHE_CONFIG = {
  banners: 5 * 60 * 1000,      // 5 minutes
  categories: 10 * 60 * 1000,  // 10 minutes
  products: 5 * 60 * 1000,     // 5 minutes
  trending: 5 * 60 * 1000,     // 5 minutes
};

// ✅ Cache check interval - reduced to 2 minutes
const CACHE_CHECK_INTERVAL = 2 * 60 * 1000;

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const categorySliderRef = useRef<any>(null);
  const recentRowDesktopRef = useRef<HTMLDivElement>(null);
  const trendingRowDesktopRef = useRef<HTMLDivElement>(null);

  // ✅ Get optimized banner based on screen size
  const getOptimizedBanner = useCallback((url: string) => {
    if (typeof window === 'undefined') return optimizeBannerImage(url, 'desktop');
    
    const width = window.innerWidth;
    if (width <= 640) return optimizeBannerImage(url, 'mobile');
    if (width <= 1024) return optimizeBannerImage(url, 'tablet');
    return optimizeBannerImage(url, 'desktop');
  }, []);

  // ✅ Get optimized product image
  const getProductImage = useCallback((imageUrls: string) => {
    const firstImage = getFirstImageOrPlaceholder(imageUrls, '/placeholder-product.jpg');
    return optimizeProductImage(firstImage, 'small');
  }, []);

  // ✅ Initialize homepage
  useEffect(() => {
    initializeHomepage();
    loadRecentlyViewed();
  }, []);

  // ✅ Background cache refresh
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
      loadRecentlyViewed();
    }, CACHE_CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  // ✅ Listen for admin updates
  useEffect(() => {
    const handleAdminUpdate = () => {
      forceRefresh();
    };
    
    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, []);

  const initializeHomepage = async () => {
    try {
      const cachedData = loadFromLocalCache();
      if (cachedData.hasValidCache) {
        if (cachedData.banners) setBanners(cachedData.banners);
        if (cachedData.categories) setCategories(cachedData.categories);
        if (cachedData.products) setProducts(cachedData.products);
        if (cachedData.trending) setTrendingProducts(cachedData.trending);
        setLoading(false);
      }
      await fetchAndUpdateData(!cachedData.hasValidCache);
    } catch {
      await fetchAndUpdateData(true);
    }
  };

  const loadFromLocalCache = useCallback(() => {
    try {
      const now = Date.now();
      const cached = {
        banners: null as Banner[] | null,
        categories: null as Category[] | null,
        products: null as Product[] | null,
        trending: null as Product[] | null,
        hasValidCache: false
      };

      const bannersCache = localStorage.getItem('studentstore_cache_banners');
      if (bannersCache) {
        const { data, timestamp } = JSON.parse(bannersCache);
        if (now - timestamp < CACHE_CONFIG.banners) cached.banners = data;
      }

      const categoriesCache = localStorage.getItem('studentstore_cache_categories');
      if (categoriesCache) {
        const { data, timestamp } = JSON.parse(categoriesCache);
        if (now - timestamp < CACHE_CONFIG.categories) cached.categories = data;
      }

      const productsCache = localStorage.getItem('studentstore_cache_products');
      if (productsCache) {
        const { data, timestamp } = JSON.parse(productsCache);
        if (now - timestamp < CACHE_CONFIG.products) cached.products = data;
      }

      const trendingCache = localStorage.getItem('studentstore_cache_trending');
      if (trendingCache) {
        const { data, timestamp } = JSON.parse(trendingCache);
        if (now - timestamp < CACHE_CONFIG.trending) cached.trending = data;
      }

      cached.hasValidCache = !!(cached.banners && cached.categories && cached.products);
      return cached;
    } catch {
      return { hasValidCache: false, banners: null, categories: null, products: null, trending: null };
    }
  }, []);

  const saveToLocalCache = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(`studentstore_cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Cache save failed - continue without caching
    }
  }, []);

  const fetchAndUpdateData = async (showLoading: boolean = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const now = Date.now();
      const cacheBuster = `t=${now}`;

      const [bannerRes, categoryRes, productsRes, trendingRes] = await Promise.all([
        fetch(`${apiUrl}/api/public/banners?${cacheBuster}`, { 
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(15000)
        }),
        fetch(`${apiUrl}/api/public/categories?${cacheBuster}`, { 
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(15000)
        }),
        fetch(`${apiUrl}/api/public/products?limit=${MAX_FEATURED_PRODUCTS}&${cacheBuster}`, { 
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(15000)
        }),
        fetch(`${apiUrl}/api/public/products?limit=${MAX_TRENDING_PRODUCTS}&sort=trending&${cacheBuster}`, { 
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(15000)
        })
      ]);

      const bannerData = await bannerRes.json();
      if (bannerData.status === 'success') {
        setBanners(bannerData.data);
        saveToLocalCache('banners', bannerData.data);
      }

      const categoryData = await categoryRes.json();
      if (categoryData.status === 'success') {
        setCategories(categoryData.data);
        saveToLocalCache('categories', categoryData.data);
      }

      const productsData = await productsRes.json();
      if (productsData.status === 'success') {
        setProducts(productsData.data.products);
        saveToLocalCache('products', productsData.data.products);
      }

      const trendingData = await trendingRes.json();
      if (trendingData.status === 'success') {
        const trendingList = trendingData.data.products?.slice(0, MAX_TRENDING_PRODUCTS) || [];
        setTrendingProducts(trendingList);
        saveToLocalCache('trending', trendingList);
      }

      setLastRefresh(now);
    } catch (err) {
      console.error('Homepage fetch error:', err);
      
      const cached = loadFromLocalCache();
      if (cached.hasValidCache) {
        if (cached.banners) setBanners(cached.banners);
        if (cached.categories) setCategories(cached.categories);
        if (cached.products) setProducts(cached.products);
        if (cached.trending) setTrendingProducts(cached.trending);
        
        setError('Showing cached content. Server might be starting up.');
      } else {
        setError('Unable to load content. The server might be starting up (takes 20-30 seconds on free hosting). Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkAndRefreshExpiredCache = useCallback(async () => {
    const now = Date.now();
    let needsRefresh = false;

    Object.keys(CACHE_CONFIG).forEach((key) => {
      const cached = localStorage.getItem(`studentstore_cache_${key}`);
      if (cached) {
        try {
          const { timestamp } = JSON.parse(cached);
          if (now - timestamp >= CACHE_CONFIG[key as keyof typeof CACHE_CONFIG]) {
            needsRefresh = true;
          }
        } catch {
          needsRefresh = true;
        }
      }
    });

    if (needsRefresh) {
      await fetchAndUpdateData(false);
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    ['banners', 'categories', 'products', 'trending'].forEach(key => {
      localStorage.removeItem(`studentstore_cache_${key}`);
    });
    await fetchAndUpdateData(false);
  }, []);

  const loadRecentlyViewed = useCallback(() => {
    const recentProducts = getRecentlyViewed();
    setRecentlyViewed(recentProducts.slice(0, MAX_RECENTLY_VIEWED));
  }, []);

  // ✅ Memoized banner settings
  const bannerSettings = useMemo(() => ({
    dots: true,
    arrows: false,
    infinite: banners.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: banners.length > 1,
    autoplaySpeed: 4500,
    fade: false,
    pauseOnHover: true,
    pauseOnFocus: true,
    pauseOnDotsHover: true,
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    touchThreshold: 10,
    draggable: true,
    accessibility: true,
    useCSS: true,
    useTransform: true,
    waitForAnimate: false,
    focusOnSelect: false,
    dotsClass: "slick-dots carousel-dots",
    responsive: [
      {
        breakpoint: 1023,
        settings: {
          arrows: false,
          speed: 400,
          autoplaySpeed: 5000,
          touchThreshold: 8,
          swipe: true,
          touchMove: true,
          draggable: true,
        }
      }
    ]
  }), [banners.length]);

  // ✅ Memoized category settings
  const categoryDesktopSettings = useMemo(() => ({
    dots: false,
    arrows: false,
    infinite: false,
    speed: 350,
    slidesToShow: 5,
    slidesToScroll: 1,
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    touchThreshold: 5,
    draggable: true,
    accessibility: true,
    cssEase: 'ease-out',
    useCSS: true,
    useTransform: true,
    waitForAnimate: false,
  }), []);

  const categoryRowSettings = useMemo(() => ({
    dots: false,
    arrows: false,
    infinite: false,
    speed: 320,
    slidesToShow: 3.2,
    slidesToScroll: 1,
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    touchThreshold: 5,
    draggable: true,
    cssEase: 'cubic-bezier(0.4, 0, 0.2, 1)',
    useCSS: true,
    useTransform: true,
    waitForAnimate: false,
    edgeFriction: 0.15,
    responsive: [
      { breakpoint: 768, settings: { slidesToShow: 3.2, centerPadding: '10px' } },
      { breakpoint: 640, settings: { slidesToShow: 3.2, centerPadding: '10px' } },
      { breakpoint: 480, settings: { slidesToShow: 3.0, centerPadding: '8px' } },
    ],
  }), []);

  // ✅ Split categories into two rows
  const { topRowCategories, bottomRowCategories } = useMemo(() => {
    const mid = Math.ceil(categories.length / 2);
    return {
      topRowCategories: categories.slice(0, mid),
      bottomRowCategories: categories.slice(mid),
    };
  }, [categories]);

  const LoadingSection = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
        ))}
      </div>
    </div>
  );

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
      <Navbar />

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <span className="text-yellow-500 mr-3 text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-yellow-800 text-sm font-medium">{error}</p>
                  <p className="text-yellow-700 text-xs mt-1">
                    This might be due to server startup delay (free hosting).
                  </p>
                </div>
              </div>
              <button 
                onClick={forceRefresh}
                className="ml-4 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors flex-shrink-0"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ TOUCH-FRIENDLY Banner Section */}
      {/* ✅ SMART Banner Section - Swipe vs Tap Detection */}
<section className="banner-container relative max-w-7xl mx-auto">
  <div className="relative" style={{ paddingBottom: '40px' }}>
    <div className="rounded-xl lg:rounded-2xl shadow-lg lg:shadow-2xl">
      {banners.length > 0 ? (
        <Slider {...bannerSettings}>
          {banners.map((banner) => {
            // ✅ Check if link is internal or external
            const isInternalLink = banner.link_url.includes('studentstore-zeta.vercel.app') || 
                                   banner.link_url.startsWith('/') ||
                                   (typeof window !== 'undefined' && banner.link_url.startsWith(window.location.origin));
            
            // ✅ Extract relative path for internal links
            const getRelativePath = (url: string) => {
              try {
                if (url.startsWith('/')) return url;
                
                const urlObj = new URL(url);
                if (typeof window !== 'undefined' && 
                    (urlObj.hostname === 'studentstore-zeta.vercel.app' || 
                     urlObj.hostname === window.location.hostname)) {
                  return urlObj.pathname + urlObj.search + urlObj.hash;
                }
                
                return url;
              } catch {
                return url;
              }
            };

            const href = isInternalLink ? getRelativePath(banner.link_url) : banner.link_url;

            // ✅ Track touch/mouse movement to detect swipe
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;

            const handleTouchStart = (e: React.TouchEvent) => {
              const touch = e.touches[0];
              touchStartX = touch.clientX;
              touchStartY = touch.clientY;
              touchStartTime = Date.now();
            };

            const handleMouseDown = (e: React.MouseEvent) => {
              touchStartX = e.clientX;
              touchStartY = e.clientY;
              touchStartTime = Date.now();
            };

            const handleTouchEnd = (e: React.TouchEvent) => {
              const touch = e.changedTouches[0];
              const touchEndX = touch.clientX;
              const touchEndY = touch.clientY;
              const touchEndTime = Date.now();

              const deltaX = Math.abs(touchEndX - touchStartX);
              const deltaY = Math.abs(touchEndY - touchStartY);
              const deltaTime = touchEndTime - touchStartTime;

              // ✅ If movement is more than 10px or took longer than 300ms, it's a swipe
              if (deltaX > 10 || deltaY > 10 || deltaTime > 300) {
                return; // It's a swipe, don't navigate
              }

              // ✅ It's a tap, navigate
              e.preventDefault();
              e.stopPropagation();
              
              if (isInternalLink) {
                window.location.href = href;
              } else {
                window.open(href, '_blank', 'noopener,noreferrer');
              }
            };

            const handleClick = (e: React.MouseEvent) => {
              const deltaX = Math.abs(e.clientX - touchStartX);
              const deltaY = Math.abs(e.clientY - touchStartY);
              const deltaTime = Date.now() - touchStartTime;

              // ✅ If movement is more than 5px or took longer than 300ms, it's a drag
              if (deltaX > 5 || deltaY > 5 || deltaTime > 300) {
                e.preventDefault();
                return; // It's a drag, don't navigate
              }

              // ✅ It's a click, navigate
              e.preventDefault();
              e.stopPropagation();
              
              if (isInternalLink) {
                window.location.href = href;
              } else {
                window.open(href, '_blank', 'noopener,noreferrer');
              }
            };

            return (
              <div key={banner.id} className="relative">
                <div
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onClick={handleClick}
                  className="block relative cursor-pointer"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    touchAction: 'pan-x'  // Allow horizontal swipe
                  }}
                >
                  {banner.media_url.includes('.mp4') || banner.media_url.includes('.webm') ? (
                    <video 
                      src={banner.media_url} 
                      autoPlay 
                      muted 
                      loop 
                      playsInline 
                      className="banner-image"
                      style={{ pointerEvents: 'none' }}
                    />
                  ) : (
                    <img 
                      src={getOptimizedBanner(banner.media_url)} 
                      alt={banner.name} 
                      className="banner-image" 
                      loading="eager"
                      decoding="async"
                      width={1920}
                      height={1080}
                      draggable={false}
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </Slider>
      ) : (
        <div className="bg-student-hero banner-image flex items-center justify-center rounded-xl lg:rounded-2xl">
          <div className="text-center text-white px-4">
            <h2 className="banner-title">Welcome to StudentStore</h2>
            <p className="text-sm sm:text-base lg:text-lg opacity-90">
              Your personal shopping companion for student life
            </p>
          </div>
        </div>
      )}
    </div>
  </div>
</section>


      {/* Recently Viewed Section - With Blue Background */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
          <div className="recently-viewed-section">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-1 h-7 sm:h-8 bg-gradient-to-b from-student-blue to-cyan-400 rounded-full mr-2.5 sm:mr-3"></div>
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-student-primary">
                  🔄 Continue Your Shopping Journey
                </h3>
              </div>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth">
              <div className="flex gap-3">
                {recentlyViewed.map((item, idx) => (
                  <div
                    key={`recent-m-${item.product.id}-${idx}`}
                    className="snap-start shrink-0"
                    style={{ width: '140px' }}
                  >
                    <Link href={`/products/${item.product.id}`} className="block">
                      <div
                        style={{
                          width: '140px',
                          aspectRatio: '1 / 1',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: 'var(--bg-light)',
                          marginBottom: '6px',
                        }}
                      >
                        <img
                          src={getProductImage(item.product.image_urls)}
                          alt={item.product.name}
                          loading="lazy"
                          width={400}
                          height={400}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <p className="text-xs text-student-primary font-medium line-clamp-2 px-1 leading-tight">
                        {item.product.name}
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Tablet View */}
            <div className="hidden sm:block lg:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth">
              <div className="flex gap-3">
                {recentlyViewed.map((item) => (
                  <div
                    key={`recent-t-${item.product.id}`}
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (3 * 12px)) / 4.5)' }}
                  >
                    <RecentlyViewedCard product={item.product} viewedAt={item.viewedAt} />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto snap-x snap-mandatory scroll-smooth">
              <div ref={recentRowDesktopRef} className="flex gap-4">
                {recentlyViewed.map((item) => (
                  <div
                    key={`recent-d-${item.product.id}`}
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (5 * 16px)) / 6)' }}
                  >
                    <RecentlyViewedCard product={item.product} viewedAt={item.viewedAt} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trending Section - With Orange Background */}
      {trendingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
          <div className="trending-section">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="w-1 h-7 sm:h-8 bg-gradient-to-b from-student-orange to-red-500 rounded-full mr-2.5 sm:mr-3"></div>
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-student-primary">
                  🔥 What's Trending Among Students
                </h3>
              </div>
              <div className="trending-live-indicator ml-7 mt-2 sm:mt-3">
                <div className="flex items-center text-xs sm:text-sm text-student-orange">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-ping"></div>
                  <span className="font-medium">Live trending data • Updated every 5 minutes</span>
                </div>
              </div>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth">
              <div className="flex gap-3">
                {trendingProducts.map((product, index) => (
                  <div
                    key={`trending-m-${product.id}-${index}`}
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (2 * 12px)) / 3.5)' }}
                  >
                    <TrendingCard product={product} trendingRank={index + 1} />
                  </div>
                ))}
              </div>
            </div>

            {/* Tablet View */}
            <div className="hidden sm:block lg:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth">
              <div className="flex gap-3">
                {trendingProducts.map((product, index) => (
                  <div
                    key={`trending-t-${product.id}-${index}`}
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (3 * 12px)) / 4.5)' }}
                  >
                    <TrendingCard product={product} trendingRank={index + 1} />
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block overflow-x-auto snap-x snap-mandatory scroll-smooth">
              <div ref={trendingRowDesktopRef} className="flex gap-4">
                {trendingProducts.map((product, index) => (
                  <div
                    key={`trending-d-${product.id}-${index}`}
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (5 * 16px)) / 6)' }}
                  >
                    <TrendingCard product={product} trendingRank={index + 1} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Section */}
      <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
        <div className="category-section">
          <div className="mb-6 lg:mb-8 text-center">
            <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2">
              Shop by Category
            </h3>
            <p className="text-red-50 text-base lg:text-lg opacity-90">
              Find exactly what you need for your student life
            </p>
          </div>

          {categories.length > 0 ? (
            <>
              {/* Desktop */}
              <div className="hidden xl:block">
                <Slider {...categoryDesktopSettings} ref={categorySliderRef}>
                  {categories.map((category) => (
                    <div key={category.id} className="px-1">
                      <CategoryCard category={category} />
                    </div>
                  ))}
                </Slider>
              </div>

              {/* Mobile/Tablet - Two Rows */}
              <div className="block xl:hidden">
                <div className="mb-3">
                  <Slider {...categoryRowSettings}>
                    {topRowCategories.map((category) => (
                      <div key={category.id} className="px-1">
                        <CategoryCard category={category} />
                      </div>
                    ))}
                  </Slider>
                </div>
                <div>
                  <Slider {...categoryRowSettings}>
                    {bottomRowCategories.map((category) => (
                      <div key={category.id} className="px-1">
                        <CategoryCard category={category} />
                      </div>
                    ))}
                  </Slider>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {[
                { icon: '📚', name: 'Textbooks' },
                { icon: '💻', name: 'Electronics' },
                { icon: '✏️', name: 'Stationery' },
                { icon: '🎒', name: 'Campus Gear' },
                { icon: '📖', name: 'Courses' },
              ].map((category, index) => (
                <div key={index} className="category-card">
                  <div className="category-image-area">
                    <div className="text-4xl">{category.icon}</div>
                  </div>
                  <div className="category-text-area">
                    <h4 className="category-title font-medium text-student-primary">
                      {category.name}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
        <div className="text-center mb-8 lg:mb-12">
          <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-student-primary mb-4">
            Featured Products
          </h3>
          <p className="text-student-secondary text-base lg:text-lg max-w-2xl mx-auto">
            Handpicked products that students love, with the best deals and reviews
          </p>
        </div>

        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h4 className="text-xl font-semibold text-student-primary mb-2">
              No products available
            </h4>
            <p className="text-student-secondary">
              Check back soon for amazing student deals!
            </p>
          </div>
        )}
      </section>

      {/* See All Products Button */}
      {products.length >= MAX_FEATURED_PRODUCTS && (
        <div className="text-center mt-12 mb-16">
          <Link 
            href="/products"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-student-blue to-cyan-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <span>See All Products</span>
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <span className="ml-3 px-2.5 py-0.5 bg-white/20 rounded-full text-xs">
              {products.length}+ Products
            </span>
          </Link>
        </div>
      )}

      <Footer />
    </div>
  );
}
