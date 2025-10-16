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

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [loadingStates, setLoadingStates] = useState({
    banners: false,
    categories: false,
    products: false,
    trending: false
  });

  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const categorySliderRef = useRef<any>(null);

  const recentRowMobileRef = useRef<HTMLDivElement>(null);
  const recentRowTabletRef = useRef<HTMLDivElement>(null);
  const recentRowDesktopRef = useRef<HTMLDivElement>(null);
  const trendingRowMobileRef = useRef<HTMLDivElement>(null);
  const trendingRowTabletRef = useRef<HTMLDivElement>(null);
  const trendingRowDesktopRef = useRef<HTMLDivElement>(null);

  const CACHE_CONFIG = {
    banners: 5 * 60 * 1000,
    categories: 10 * 60 * 1000,
    products: 5 * 60 * 1000,
    trending: 5 * 60 * 1000,
  };

  // ✅ NEW: Get optimized banner based on screen size
  const getOptimizedBanner = useCallback((url: string) => {
    if (typeof window === 'undefined') return optimizeBannerImage(url, 'desktop');
    
    const width = window.innerWidth;
    if (width <= 640) return optimizeBannerImage(url, 'mobile');
    if (width <= 1024) return optimizeBannerImage(url, 'tablet');
    return optimizeBannerImage(url, 'desktop');
  }, []);

  useEffect(() => {
    initializeHomepage();
    loadRecentlyViewed();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
      loadRecentlyViewed();
    }, 30000);
    return () => clearInterval(interval);
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
  };

  const fetchAndUpdateData = async (showLoading: boolean = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const now = Date.now();
      const cacheBuster = `t=${now}&v=${Math.random().toString(36).substr(2, 9)}`;

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
        const bannersData = bannerData.data;
        setBanners(bannersData);
        saveToLocalCache('banners', bannersData);
      }

      const categoryData = await categoryRes.json();
      if (categoryData.status === 'success') {
        const categoriesData = categoryData.data;
        setCategories(categoriesData);
        saveToLocalCache('categories', categoriesData);
      }

      const productsData = await productsRes.json();
      if (productsData.status === 'success') {
        const productList = productsData.data.products;
        setProducts(productList);
        saveToLocalCache('products', productList);
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
        
        setError('Showing cached content. Click refresh for latest updates.');
      } else {
        setError('Unable to load content. The server might be starting up (takes 20-30 seconds on free hosting). Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalCache = (key: string, data: any) => {
    try {
      localStorage.setItem(`studentstore_cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // noop
    }
  };

  const checkAndRefreshExpiredCache = useCallback(async () => {
    const now = Date.now();
    const needsRefresh: Array<keyof typeof CACHE_CONFIG> = [];
    (Object.keys(CACHE_CONFIG) as Array<keyof typeof CACHE_CONFIG>).forEach((key) => {
      const cached = localStorage.getItem(`studentstore_cache_${key}`);
      if (cached) {
        try {
          const parsed: { data: any; timestamp: number } = JSON.parse(cached);
          if (now - parsed.timestamp >= CACHE_CONFIG[key]) needsRefresh.push(key);
        } catch {
          needsRefresh.push(key);
        }
      }
    });
    if (needsRefresh.length > 0) await fetchAndUpdateData(false);
  }, []);

  const forceRefresh = useCallback(async () => {
    ['banners', 'categories', 'products', 'trending'].forEach(key => {
      localStorage.removeItem(`studentstore_cache_${key}`);
    });
    setLoadingStates({ banners: true, categories: true, products: true, trending: true });
    await fetchAndUpdateData(false);
    setLoadingStates({ banners: false, categories: false, products: false, trending: false });
  }, []);

  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => { forceRefresh(); };
    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [forceRefresh]);

  const loadRecentlyViewed = useCallback(() => {
    const recentProducts = getRecentlyViewed();
    setRecentlyViewed(recentProducts.slice(0, MAX_RECENTLY_VIEWED));
  }, []);

  const scrollByCard = (
    ref: React.RefObject<HTMLDivElement | null>,
    direction: 1 | -1
  ) => {
    const row = ref.current;
    if (!row) return;
    const card = row.querySelector<HTMLElement>('[data-snap-card]');
    const style = window.getComputedStyle(row);
    const gapPx = parseFloat(style.columnGap || style.gap || '16');
    const delta = (card?.offsetWidth || 300) + gapPx;
    row.scrollBy({ left: direction * delta, behavior: 'smooth' });
  };

  const bannerSettings = {
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
  };

  const categoryDesktopSettings = {
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
  };

  const categoryRowSettings = {
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
  };

  const { topRowCategories, bottomRowCategories } = useMemo(() => {
    const mid = Math.ceil(categories.length / 2);
    return {
      topRowCategories: categories.slice(0, mid),
      bottomRowCategories: categories.slice(mid),
    };
  }, [categories]);

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

  const CacheStatusIndicator = () => {
    const cacheAge = lastRefresh ? Math.floor((Date.now() - lastRefresh) / 1000) : 0;
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs z-50">
        Cache: {cacheAge}s ago
        <button onClick={forceRefresh} className="ml-2 text-yellow-300 hover:text-yellow-100" title="Force refresh">
          ↻
        </button>
      </div>
    );
  };

  // ✅ OPTIMIZED: Get optimized product image
  const getProductImage = (imageUrls: string) => {
    const firstImage = getFirstImageOrPlaceholder(imageUrls, '/placeholder-product.jpg');
    return optimizeProductImage(firstImage, 'small');
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
      <Navbar />
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <span className="text-yellow-500 mr-3 text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-yellow-800 text-sm font-medium">{error}</p>
                  <p className="text-yellow-700 text-xs mt-1">
                    This might be due to server startup delay (free hosting). Usually takes 20-30 seconds.
                  </p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  setError(null);
                  await forceRefresh();
                }}
                className="ml-4 px-3 py-1.5 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 transition-colors flex-shrink-0"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ OPTIMIZED: Banner Section */}
      <section className="banner-container relative max-w-7xl mx-auto">
        <div className="relative" style={{ paddingBottom: '40px' }}>
          <div className="rounded-xl lg:rounded-2xl shadow-lg lg:shadow-2xl">
            {loadingStates.banners ? (
              <div className="banner-loading"></div>
            ) : banners.length > 0 ? (
              <Slider {...bannerSettings}>
                {banners.map((banner) => (
                  <div key={banner.id} className="relative">
                    <a href={banner.link_url} target="_blank" rel="noopener noreferrer" className="block relative touch-optimized">
                      {banner.media_url.includes('.mp4') || banner.media_url.includes('.webm') ? (
                        <video src={banner.media_url} autoPlay muted loop playsInline className="banner-image touch-optimized" />
                      ) : (
                        <img 
                          src={getOptimizedBanner(banner.media_url)} 
                          alt={banner.name} 
                          className="banner-image touch-optimized" 
                          loading="eager"
                          decoding="async"
                          width={1920}
                          height={1080}
                        />
                      )}
                      <div className="banner-overlay">
                        <h2 className="banner-title">{banner.name}</h2>
                        <button className="banner-btn">
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
              <div className="bg-student-hero banner-image flex items-center justify-center rounded-xl lg:rounded-2xl">
                <div className="text-center text-white px-4">
                  <h2 className="banner-title">Welcome to StudentStore</h2>
                  <p className="text-sm sm:text-base lg:text-lg opacity-90">Your personal shopping companion for student life</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recently Viewed Section */}
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

            <div className="block sm:hidden -mx-4 px-4">
              <div
                ref={recentRowMobileRef}
                className="rv-grid-mobile"
                style={{
                  display: 'grid',
                  gridAutoFlow: 'column',
                  gridTemplateRows: '1fr 1fr',
                  gap: '12px',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch' as any,
                  scrollSnapType: 'x mandatory',
                  paddingBottom: '2px',
                }}
              >
                {recentlyViewed.map((item, idx) => (
                  <div
                    key={`recent-m2-${item.product.id}-${item.viewedAt}-${idx}`}
                    className="shrink-0"
                    style={{
                      scrollSnapAlign: 'start',
                      width: '140px',
                    }}
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
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC01IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
                          }}
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

            <div className="hidden sm:block lg:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain">
              <div ref={recentRowTabletRef} className="flex gap-3">
                {recentlyViewed.map((item) => (
                  <div
                    key={`recent-t-${item.product.id}-${item.viewedAt}`}
                    data-snap-card
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (3 * 12px)) / 4.5)' }}
                  >
                    <RecentlyViewedCard product={item.product} viewedAt={item.viewedAt} />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block row-desktop">
              <div className="overflow-x-auto scroll-smooth overscroll-x-contain">
                <div
                  ref={recentRowDesktopRef}
                  className="flex gap-4 snap-x snap-mandatory"
                  style={{ scrollPaddingLeft: '16px' }}
                >
                  {recentlyViewed.map((item) => (
                    <div
                      key={`recent-d-${item.product.id}-${item.viewedAt}`}
                      data-snap-card
                      className="snap-start shrink-0"
                      style={{ width: 'calc((100% - (5 * 16px)) / 6)' }}
                    >
                      <RecentlyViewedCard product={item.product} viewedAt={item.viewedAt} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trending Section */}
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

            <div className="block sm:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain">
              <div ref={trendingRowMobileRef} className="flex gap-3">
                {trendingProducts.map((product, index) => (
                  <div
                    key={`trending-m-${product.id}-${index}`}
                    data-snap-card
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (2 * 12px)) / 3.5)' }}
                  >
                    <TrendingCard product={product} trendingRank={index + 1} />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:block lg:hidden -mx-4 px-4 overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain">
              <div ref={trendingRowTabletRef} className="flex gap-3">
                {trendingProducts.map((product, index) => (
                  <div
                    key={`trending-t-${product.id}-${index}`}
                    data-snap-card
                    className="snap-start shrink-0"
                    style={{ width: 'calc((100% - (3 * 12px)) / 4.5)' }}
                  >
                    <TrendingCard product={product} trendingRank={index + 1} />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden lg:block row-desktop">
              <div className="overflow-x-auto scroll-smooth overscroll-x-contain">
                <div
                  ref={trendingRowDesktopRef}
                  className="flex gap-4 snap-x snap-mandatory"
                  style={{ scrollPaddingLeft: '16px' }}
                >
                  {trendingProducts.map((product, index) => (
                    <div
                      key={`trending-d-${product.id}-${index}`}
                      data-snap-card
                      className="snap-start shrink-0"
                      style={{ width: 'calc((100% - (5 * 16px)) / 6)' }}
                    >
                      <TrendingCard product={product} trendingRank={index + 1} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Category Cards */}
      <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
        <div className="category-section">
          <div className="mb-6 lg:mb-8 text-center">
            <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2">Shop by Category</h3>
            <p className="text-red-50 text-base lg:text-lg opacity-90">Find exactly what you need for your student life</p>
          </div>

          {loadingStates.categories ? (
            <LoadingSection title="Categories" />
          ) : categories.length > 0 ? (
            <>
              <div className="desktop-category-container hidden xl:block">
                <Slider {...categoryDesktopSettings} ref={categorySliderRef}>
                  {categories.map((category) => (
                    <div key={category.id} className="px-1">
                      <CategoryCard category={category} />
                    </div>
                  ))}
                </Slider>
              </div>

              <div className="mobile-category-container block xl:hidden">
                <div className="category-row mb-3">
                  <Slider {...categoryRowSettings}>
                    {topRowCategories.map((category) => (
                      <div key={category.id} className="px-1">
                        <CategoryCard category={category} />
                      </div>
                    ))}
                  </Slider>
                </div>
                <div className="category-row">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
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
                    <h4 className="category-title font-medium text-student-primary">{category.name}</h4>
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

        {loadingStates.products ? (
          <LoadingSection title="Featured Products" />
        ) : products.length > 0 ? (
          <div className="product-grid">
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

      {products.length >= MAX_FEATURED_PRODUCTS && (
        <div className="text-center mt-12">
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
