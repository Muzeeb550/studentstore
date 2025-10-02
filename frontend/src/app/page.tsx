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

  const [loadingStates, setLoadingStates] = useState({
    banners: false,
    categories: false,
    products: false,
    trending: false
  });

  const [cacheState, setCacheState] = useState<Partial<CacheState>>({});
  const [lastRefresh, setLastRefresh] = useState<number>(0);

  const categorySliderRef = useRef<any>(null);
  const recentlyViewedSliderRef = useRef<any>(null);
  const trendingSliderRef = useRef<any>(null);

  const CACHE_CONFIG = {
    banners: 5 * 60 * 1000,
    categories: 10 * 60 * 1000,
    products: 5 * 60 * 1000,
    trending: 5 * 60 * 1000,
  };

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
  }, [cacheState]);

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
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const now = Date.now();
      const cacheBuster = `t=${now}&v=${Math.random().toString(36).substr(2, 9)}`;

      const [bannerRes, categoryRes, productsRes, trendingRes] = await Promise.all([
        fetch(`${apiUrl}/api/public/banners?${cacheBuster}`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`${apiUrl}/api/public/categories?${cacheBuster}`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`${apiUrl}/api/public/products?limit=12&${cacheBuster}`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`${apiUrl}/api/public/products?limit=10&sort=trending&${cacheBuster}`, { headers: { 'Cache-Control': 'no-cache' } })
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
        const trendingList = trendingData.data.products?.slice(0, 10) || [];
        setTrendingProducts(trendingList);
        saveToLocalCache('trending', trendingList);
      }

      setLastRefresh(now);
    } catch {
      // noop
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
    setRecentlyViewed(recentProducts);
  }, []);

  // FIXED: Enhanced Desktop Arrow Components - More Responsive
  const DesktopPrevArrow = ({ onClick }: any) => (
    <button 
      onClick={onClick} 
      className="desktop-carousel-arrow prev enhanced-arrow" 
      aria-label="Previous slide"
      type="button"
    >
      <svg className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  const DesktopNextArrow = ({ onClick }: any) => (
    <button 
      onClick={onClick} 
      className="desktop-carousel-arrow next enhanced-arrow" 
      aria-label="Next slide"
      type="button"
    >
      <svg className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  // FIXED: Ultra-Responsive Trending Arrow Components
  const TrendingPrevArrow = ({ onClick }: any) => (
    <button 
      onClick={onClick} 
      className="trending-carousel-arrow prev ultra-smooth-arrow" 
      aria-label="Previous trending products"
      type="button"
    >
      <svg className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  const TrendingNextArrow = ({ onClick }: any) => (
    <button 
      onClick={onClick} 
      className="trending-carousel-arrow next ultra-smooth-arrow" 
      aria-label="Next trending products"
      type="button"
    >
      <svg className="w-6 h-6 text-gray-700 group-hover:text-white transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  const bannerSettings = {
    dots: true,
    infinite: banners.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: banners.length > 1,
    autoplaySpeed: 4500,
    fade: false,
    prevArrow: <DesktopPrevArrow />,
    nextArrow: <DesktopNextArrow />,
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
    dotsClass: "slick-dots mobile-banner-dots",
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

  // Single-row desktop category slider settings (≥769px ONLY)
  const categoryDesktopSettings = {
    dots: false,
    infinite: false,
    speed: 350,
    slidesToShow: 5,
    slidesToScroll: 1,
    prevArrow: <DesktopPrevArrow />,
    nextArrow: <DesktopNextArrow />,
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
    // NO responsive breakpoints - this is desktop only
  };

  // Two independent row sliders for mobile/tablet (<=768px)
  const categoryRowSettings = {
    dots: false,
    infinite: false,
    speed: 320,
    slidesToShow: 3.2, // ~30% width each with partial next card
    slidesToScroll: 1,
    arrows: false,
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

// MOBILE-OPTIMIZED: Recently Viewed Carousel Settings - 2 Cards + Peek
const recentlyViewedSettings = {
  dots: false,
  infinite: false,
  speed: 350,
  slidesToShow: 4, // Desktop default
  slidesToScroll: 1,
  prevArrow: <DesktopPrevArrow />,
  nextArrow: <DesktopNextArrow />,
  swipeToSlide: true,
  
  // Enhanced mobile physics
  touchThreshold: 4,
  cssEase: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  useCSS: true,
  useTransform: true,
  waitForAnimate: false,
  focusOnSelect: false,
  accessibility: true,
  
  responsive: [
    { 
      breakpoint: 1280, 
      settings: { 
        slidesToShow: 3, 
        slidesToScroll: 1, 
        arrows: true,
        speed: 320,
        touchThreshold: 3
      } 
    },
    { 
      breakpoint: 1024, 
      settings: { 
        slidesToShow: 2.8, // Show more cards on tablet
        slidesToScroll: 1, 
        arrows: false, 
        speed: 300,
        touchThreshold: 3,
        centerPadding: '12px'
      } 
    },
    { 
      breakpoint: 768, 
      settings: { 
        slidesToShow: 2.5, // 2.5 cards - better for tablet
        slidesToScroll: 1, 
        arrows: false, 
        speed: 280,
        touchThreshold: 2,
        centerPadding: '15px'
      } 
    },
    { 
      breakpoint: 640, 
      settings: { 
        slidesToShow: 2.3, // ⭐ KEY: 2 full + 30% peek
        slidesToScroll: 1, 
        arrows: false, 
        speed: 250,
        touchThreshold: 2,
        centerPadding: '18px'
      } 
    },
    { 
      breakpoint: 480, 
      settings: { 
        slidesToShow: 2.1, // ⭐ KEY: 2 full + 10% peek on small mobile
        slidesToScroll: 1, 
        arrows: false, 
        speed: 230,
        touchThreshold: 1,
        centerPadding: '20px'
      } 
    },
  ],
};

// MOBILE-OPTIMIZED: Trending Carousel Settings - 2 Cards + Peek  
const trendingSettings = {
  dots: false,
  infinite: false,
  speed: 350,
  slidesToShow: 4, // Desktop default
  slidesToScroll: 1,
  prevArrow: <TrendingPrevArrow />,
  nextArrow: <TrendingNextArrow />,
  swipeToSlide: true,
  
  // Enhanced mobile physics
  touchThreshold: 4,
  swipeThreshold: 8,
  cssEase: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  useCSS: true,
  useTransform: true,
  waitForAnimate: false,
  focusOnSelect: false,
  accessibility: true,
  draggable: true,
  touchMove: true,
  variableWidth: false,
  centerMode: false,
  
  responsive: [
    { 
      breakpoint: 1536,
      settings: { 
        slidesToShow: 4, 
        slidesToScroll: 1,
        arrows: true,
        speed: 350,
        touchThreshold: 4
      } 
    },
    { 
      breakpoint: 1280, 
      settings: { 
        slidesToShow: 3, 
        slidesToScroll: 1, 
        arrows: true,
        speed: 320,
        touchThreshold: 3
      } 
    },
    { 
      breakpoint: 1024, 
      settings: { 
        slidesToShow: 2.8, // Show more cards on tablet
        slidesToScroll: 1, 
        arrows: false, 
        speed: 300,
        touchThreshold: 3,
        centerPadding: '12px'
      } 
    },
    { 
      breakpoint: 768, 
      settings: { 
        slidesToShow: 2.5, // 2.5 cards - better for tablet
        slidesToScroll: 1, 
        arrows: false, 
        speed: 280,
        touchThreshold: 2,
        centerPadding: '15px'
      } 
    },
    { 
      breakpoint: 640, 
      settings: { 
        slidesToShow: 2.3, // ⭐ KEY: 2 full + 30% peek
        slidesToScroll: 1, 
        arrows: false, 
        speed: 250,
        touchThreshold: 2,
        centerPadding: '18px'
      } 
    },
    { 
      breakpoint: 480, 
      settings: { 
        slidesToShow: 2.1, // ⭐ KEY: 2 full + 10% peek on small mobile
        slidesToScroll: 1, 
        arrows: false, 
        speed: 230,
        touchThreshold: 1,
        centerPadding: '20px'
      } 
    },
  ],
};


  // FIXED: Enhanced Product Carousel Settings (for other sections)
  const productCarouselSettings = {
    dots: false,
    infinite: false,
    speed: 400,
    slidesToShow: 4,
    slidesToScroll: 1,
    prevArrow: <DesktopPrevArrow />,
    nextArrow: <DesktopNextArrow />,
    swipeToSlide: true,
    
    // FIXED: Desktop optimization
    touchThreshold: 5,
    cssEase: 'cubic-bezier(0.4, 0, 0.2, 1)',
    useCSS: true,
    useTransform: true,
    waitForAnimate: false,
    focusOnSelect: false,
    
    responsive: [
      { 
        breakpoint: 1280, 
        settings: { 
          slidesToShow: 3, 
          slidesToScroll: 1, 
          arrows: true,
          speed: 350,
          touchThreshold: 4
        } 
      },
      { 
        breakpoint: 1024, 
        settings: { 
          slidesToShow: 2, 
          slidesToScroll: 1, 
          arrows: false, 
          speed: 300,
          touchThreshold: 4
        } 
      },
      { 
        breakpoint: 640, 
        settings: { 
          slidesToShow: 1.8, 
          slidesToScroll: 1, 
          arrows: false, 
          speed: 280,
          touchThreshold: 3,
          centerPadding: '10px'
        } 
      },
    ],
  };

  // Split categories evenly into two arrays for mobile two rows
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
  };

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

      {/* Banner */}
      <section className="banner-container relative max-w-7xl mx-auto">
        <div className="rounded-xl lg:rounded-2xl overflow-hidden shadow-lg lg:shadow-2xl relative">
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
                      <img src={banner.media_url} alt={banner.name} className="banner-image touch-optimized" loading="eager" />
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
      </section>

      {/* Enhanced Recently Viewed Section */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
          <div className="recently-viewed-section">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-student-blue to-cyan-400 rounded-full mr-3"></div>
                <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-student-primary">
                  🔄 Continue Your Shopping Journey
                </h3>
              </div>
              <p className="text-student-secondary text-base lg:text-lg ml-7">
                Don't lose track of these great finds - pick up exactly where you left off!
              </p>
              <div className="recently-viewed-progress ml-7 mt-3">
                <div className="flex items-center text-sm text-student-blue">
                  <div className="w-2 h-2 bg-student-blue rounded-full mr-2 animate-pulse"></div>
                  <span className="font-medium">{recentlyViewed.length} items in your browsing session</span>
                </div>
              </div>
            </div>
            <div className="relative recently-viewed-carousel">
              <Slider {...recentlyViewedSettings}>
                {recentlyViewed.map((item) => (
                  <div key={`recent-${item.product.id}-${item.viewedAt}`} className="px-2">
                    <RecentlyViewedCard product={item.product} viewedAt={item.viewedAt} />
                  </div>
                ))}
              </Slider>
            </div>
          </div>
        </section>
      )}

      {/* FIXED: Enhanced Trending Section with Ultra-Smooth Navigation */}
      {trendingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
          <div className="trending-section">
            <div className="mb-6 lg:mb-8">
              <div className="flex items-center mb-4">
                <div className="w-1 h-8 bg-gradient-to-b from-student-orange to-red-500 rounded-full mr-3"></div>
                <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-student-primary">
                  🔥 What's Trending Among Students
                </h3>
              </div>
              <p className="text-student-secondary text-base lg:text-lg ml-7">
                Join thousands of students discovering these hot products right now!
              </p>
              <div className="trending-live-indicator ml-7 mt-3">
                <div className="flex items-center text-sm text-student-orange">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-ping"></div>
                  <span className="font-medium">Live trending data • Updated every hour</span>
                </div>
              </div>
            </div>
            {loadingStates.trending ? (
              <LoadingSection title="Trending Products" />
            ) : (
              <div className="relative trending-carousel-container">
                <Slider 
                  key="trending-slider-optimized"
                  {...trendingSettings}
                >
                  {trendingProducts.map((product, index) => (
                    <div key={`trending-${product.id}-${index}`} className="px-2">
                      <TrendingCard product={product} trendingRank={index + 1} />
                    </div>
                  ))}
                </Slider>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Category Cards - COMPLETELY FIXED Desktop/Mobile Logic */}
      <section className="max-w-7xl mx-auto mt-8 lg:mt-16 px-4">
        <div className="category-section-research">
          <div className="mb-6 lg:mb-8 text-center">
            <h3 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-white mb-2">Shop by Category</h3>
            <p className="text-red-50 text-base lg:text-lg opacity-90">Find exactly what you need for your student life</p>
          </div>

          {loadingStates.categories ? (
            <LoadingSection title="Categories" />
          ) : categories.length > 0 ? (
            <>
              {/* Desktop: ONLY single row with arrows (≥1280px) */}
              <div className="desktop-category-container hidden xl:block">
                <Slider {...categoryDesktopSettings}>
                  {categories.map((category) => (
                    <div key={category.id} className="px-1">
                      <CategoryCard category={category} />
                    </div>
                  ))}
                </Slider>
              </div>

              {/* Mobile/Tablet: ONLY two rows (≤1279px) */}
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
                <div key={index} className="category-card-research">
                  <div className="category-image-area">
                    <div className="text-4xl">{category.icon}</div>
                  </div>
                  <div className="category-text-area">
                    <h4 className="category-title-research font-medium text-student-primary">{category.name}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products - Mobile-Optimized Grid */}
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
          <div className="product-grid-mobile">
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

      <Footer />
    </div>
  );
}
