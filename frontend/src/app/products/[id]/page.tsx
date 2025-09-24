'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import WishlistButton from '../../components/WishlistButton';
import Footer from '../../components/Footer';
import StarRating from '../../components/StarRating';
import ReviewForm from '../../components/ReviewForm';
import ReviewList from '../../components/ReviewList';
import ReviewManager from '../../components/ReviewManager';
import { addToRecentlyViewed } from '../../utils/recentlyViewed';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  category_description: string;
  category_id: number;
  buy_button_1_name: string;
  buy_button_1_url: string;
  buy_button_2_name?: string;
  buy_button_2_url?: string;
  buy_button_3_name?: string;
  buy_button_3_url?: string;
  views_count: number;
  rating_average: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

interface RelatedProduct {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  rating_average: number | null;
  review_count: number;
}

interface ProductPageData {
  product: Product;
  related_products: RelatedProduct[];
}

// 🚀 NEW: Cache management types
interface CacheData {
  data: ProductPageData;
  timestamp: number;
}

export default function ProductPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const [data, setData] = useState<ProductPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0);
  
  // 🚀 NEW: Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    reviews: false,
    relatedProducts: false
  });

  // 🚀 NEW: Cache configuration (matches backend TTL: 300s = 5 minutes)
  const CACHE_CONFIG = {
    ttl: 5 * 60 * 1000, // 5 minutes (matches backend product cache)
  };

  useEffect(() => {
    if (productId) {
      initializeProductPage();
    }
  }, [productId]);

  // Track product view when data loads
  useEffect(() => {
    if (data?.product) {
      console.log('🔍 Tracking product page view:', data.product.name);
      addToRecentlyViewed(data.product);
    }
  }, [data]);

  useEffect(() => {
    if (data?.product?.image_urls) {
      try {
        const parsedImages = JSON.parse(data.product.image_urls);
        setImages(parsedImages);
      } catch (error) {
        console.error('Error parsing images:', error);
        setImages([]);
      }
    }
  }, [data]);

  // 🚀 NEW: Smart refresh interval for cache management
  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [productId]);

  // 🚀 NEW: Initialize with smart caching
  const initializeProductPage = async () => {
    try {
      const cachedData = loadFromCache();
      
      if (cachedData) {
        // Instant display from cache
        setData(cachedData);
        setLoading(false);
        setLoadingStates({ initial: false, reviews: false, relatedProducts: false });
        console.log(`🚀 Product ${productId} loaded from cache (instant display)`);
        
        // Background refresh if cache is getting old (> 2 minutes)
        const age = Date.now() - getCacheTimestamp();
        if (age > 120000) { // 2 minutes
          await fetchProductDetails(false);
        }
      } else {
        // No cache, fetch fresh data
        await fetchProductDetails(true);
      }
    } catch (error) {
      console.error('Product initialization error:', error);
      await fetchProductDetails(true);
    }
  };

  // 🚀 NEW: Load from cache with validation
  const loadFromCache = (): ProductPageData | null => {
    try {
      const cacheKey = `studentstore_product_${productId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // Return cached data if it's fresh (within TTL)
        if (age < CACHE_CONFIG.ttl) {
          console.log(`📊 Cache hit for product ${productId} (age: ${Math.floor(age/1000)}s)`);
          return data;
        } else {
          // Cache expired, remove it
          localStorage.removeItem(cacheKey);
          console.log(`⏰ Cache expired for product ${productId}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Cache loading error:', error);
      return null;
    }
  };

  // 🚀 NEW: Save to cache
  const saveToCache = (productData: ProductPageData) => {
    try {
      const cacheKey = `studentstore_product_${productId}`;
      const cacheData: CacheData = {
        data: productData,
        timestamp: Date.now()
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 Cached product ${productId}`);
    } catch (error) {
      console.error('Cache save error:', error);
    }
  };

  // 🚀 NEW: Get cache timestamp
  const getCacheTimestamp = (): number => {
    try {
      const cacheKey = `studentstore_product_${productId}`;
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

  // 🚀 NEW: Check and refresh expired cache
  const checkAndRefreshExpiredCache = useCallback(async () => {
    if (!data || !productId) return;
    
    const age = Date.now() - getCacheTimestamp();
    
    // If current cache is expired, refresh in background
    if (age >= CACHE_CONFIG.ttl) {
      console.log('🔄 Background refresh triggered for expired product cache');
      await fetchProductDetails(false);
    }
  }, [productId, data]);

  // 🚀 NEW: Force refresh (for admin updates)
  const forceRefresh = useCallback(async () => {
    console.log(`🚀 Force refresh product ${productId}`);
    
    // Clear cache for this product
    const cacheKey = `studentstore_product_${productId}`;
    localStorage.removeItem(cacheKey);
    
    await fetchProductDetails(false);
  }, [productId]);

  // 🚀 NEW: Listen for admin updates
  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type, productId: updatedProductId } = event.detail;
      
      // Refresh if this product was updated or if it's a review update
      if (type === 'product' || type === 'review' || 
          (updatedProductId && updatedProductId === parseInt(productId))) {
        console.log('🔄 Admin update detected for product:', event.detail);
        forceRefresh();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [productId, forceRefresh]);

  // 🚀 NEW: Listen for review updates (real-time rating updates)
  useEffect(() => {
    const handleReviewUpdate = (event: CustomEvent) => {
      const { productId: reviewProductId } = event.detail;
      
      if (reviewProductId === parseInt(productId)) {
        console.log('🔄 Review update detected, refreshing product data');
        // Clear cache and refresh
        forceRefresh();
        // Also refresh the review key for ReviewList component
        setReviewRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('reviewUpdate' as any, handleReviewUpdate);
    return () => window.removeEventListener('reviewUpdate' as any, handleReviewUpdate);
  }, [productId, forceRefresh]);

  // 🚀 ENHANCED: Fetch product details with smart caching
  const fetchProductDetails = async (showMainLoading: boolean = true) => {
    try {
      if (showMainLoading) {
        setLoading(true);
        setLoadingStates({ initial: true, reviews: false, relatedProducts: false });
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // 🚀 Cache busting for admin updates
      const cacheBuster = `t=${Date.now()}&v=${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(
        `${apiUrl}/api/public/products/${productId}?${cacheBuster}`,
        {
          headers: { 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );
      
      const result = await response.json();

      if (result.status === 'success') {
        const productData = result.data;
        setData(productData);
        setError('');
        
        // Cache the successful result
        saveToCache(productData);
        
        console.log(`🔄 Product ${productId} updated from API`);
      } else {
        setError(result.message || 'Failed to load product details');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
      setLoadingStates({ initial: false, reviews: false, relatedProducts: false });
    }
  };

  // 🚀 ENHANCED: Handle review updates with cache invalidation
  const handleReviewUpdate = useCallback(() => {
    // Clear product cache (rating/review count changed)
    const cacheKey = `studentstore_product_${productId}`;
    localStorage.removeItem(cacheKey);
    
    // Refresh product data to update rating counts
    fetchProductDetails(false);
    
    // Trigger review list refresh
    setReviewRefreshKey(prev => prev + 1);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('reviewUpdate', {
      detail: { productId: parseInt(productId) }
    }));
    
    console.log('📝 Review updated, product cache invalidated');
  }, [productId]);

  const getImageSrc = (imageUrl: string) => {
    return imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMjYwQzE3MSAyNjAgMTQ4IDIzNyAxNDggMjA4QzE0OCAxNzkgMTcxIDE1NiAyMDAgMTU2QzIyOSAxNTYgMjUyIDE3OSAyNTIgMjA4QzI1MiAyMzcgMjI5IDI2MCAyMDAgMjYwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
  };

  const handleShare = async () => {
    if (navigator.share && data?.product) {
      try {
        await navigator.share({
          title: data.product.name,
          text: `Check out this product on StudentStore: ${data.product.description}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You could add a toast notification here
    }
  };

  // Helper functions for safe rating display
  const getSafeRating = (rating: number | null): number => {
    return rating ?? 0;
  };

  const getSafeRatingDisplay = (rating: number | null): string => {
    return rating ? rating.toFixed(1) : '0.0';
  };

  // 🚀 NEW: Enhanced loading component with skeleton
  const ProductSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image skeleton */}
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-200 h-96 rounded-2xl"></div>
          <div className="flex space-x-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg flex-1"></div>
            ))}
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-6">
          <div className="animate-pulse bg-gray-200 h-8 rounded w-3/4"></div>
          <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-24 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
        </div>
      </div>
    </div>
  );

  // 🚀 NEW: Cache status indicator (development only)
  const CacheStatusIndicator = () => {
    const cacheAge = getCacheTimestamp();
    const age = cacheAge ? Math.floor((Date.now() - cacheAge) / 1000) : 0;
    
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-xs z-50">
        Cache: {age > 0 ? `${age}s` : 'none'}
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
        <div className="py-20">
          <ProductSkeleton />
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
            <button
              onClick={() => fetchProductDetails(true)}
              className="btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data || !data.product) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📦</div>
            <h1 className="text-2xl font-bold text-student-primary mb-4">Product not found</h1>
            <p className="text-student-secondary mb-6">The product you're looking for doesn't exist.</p>
            <a href="/" className="btn-primary inline-block">
              Back to StudentStore
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { product, related_products } = data;

  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* 🚀 NEW: Cache status indicator (development only) */}
      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

      {/* Enhanced Breadcrumb - StudentStore Style */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <nav className="flex items-center space-x-2 text-sm text-student-secondary mb-6 bg-student-card rounded-xl p-4 shadow-md">
          <a href="/" className="hover:text-student-blue transition-colors font-medium">
            🏠 StudentStore
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <a href={`/categories/${product.category_id}`} className="hover:text-student-blue transition-colors font-medium">
            📂 {product.category_name}
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold">{product.name}</span>
        </nav>
      </div>

      {/* Product Details - Enhanced Layout */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Product Images - Enhanced */}
          <div className="space-y-4">
            {/* Main Image Container */}
            <div className="bg-student-card rounded-2xl p-4 shadow-xl border border-border-light relative">
              <img
                src={getImageSrc(images[currentImageIndex] || '')}
                alt={product.name}
                className="w-full h-96 object-cover rounded-xl transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getImageSrc('');
                }}
              />
              
              {/* Image Counter Badge */}
              {images.length > 1 && (
                <div className="absolute top-6 right-6 bg-student-primary/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
            </div>

            {/* Thumbnail Images - Enhanced */}
            {images.length > 1 && (
              <div className="flex space-x-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-1 bg-student-card rounded-lg p-2 shadow-md transition-all duration-200 border ${
                      currentImageIndex === index 
                        ? 'ring-2 ring-student-blue border-student-blue scale-105' 
                        : 'hover:shadow-lg hover:scale-102 border-border-light'
                    }`}
                  >
                    <img
                      src={getImageSrc(image)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-20 object-cover rounded-md"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getImageSrc('');
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info - Enhanced */}
          <div className="space-y-6">
            {/* Category Badge - StudentStore Style */}
            <div className="flex items-center space-x-3">
              <span className="bg-gradient-to-r from-student-blue to-student-green text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                📂 {product.category_name}
              </span>
              <span className="bg-student-orange/20 text-student-orange px-3 py-1 rounded-full text-sm font-medium border border-student-orange/30">
                🔥 Popular
              </span>
            </div>

            {/* Product Name - Enhanced */}
            <h1 className="text-4xl md:text-5xl font-bold text-student-primary leading-tight">
              {product.name}
            </h1>

            {/* Rating and Views - Enhanced with Student Context */}
            <div className="bg-student-card rounded-xl p-4 border border-border-light shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <StarRating 
                      rating={getSafeRating(product.rating_average)} 
                      showRatingText={false}
                      size="sm"
                    />
                    <span className="ml-2 font-semibold text-student-primary">{getSafeRatingDisplay(product.rating_average)}</span>
                    <span className="ml-1 text-student-secondary">({product.review_count} student reviews)</span>
                  </div>
                </div>
                <div className="flex items-center text-student-secondary">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{product.views_count.toLocaleString()} students viewed</span>
                </div>
              </div>
            </div>

            {/* Student Actions - Wishlist and Share */}
            <div className="flex items-center justify-between bg-student-light rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <WishlistButton 
                  productId={product.id}
                  size="lg"
                  className="shadow-lg"
                />
                <div>
                  <p className="text-sm font-semibold text-student-primary">Save to Wishlist</p>
                  <p className="text-xs text-student-secondary">Compare & decide later</p>
                </div>
              </div>
              
              <button 
                onClick={handleShare}
                className="flex items-center space-x-2 bg-student-card hover:bg-student-blue hover:text-white text-student-secondary px-4 py-3 rounded-xl transition-all duration-200 border border-border-light hover:border-student-blue shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-sm font-medium">Share with Friends</span>
              </button>
            </div>

            {/* Description - Enhanced */}
            <div className="bg-student-card rounded-xl p-6 border border-border-light shadow-md">
              <h3 className="text-lg font-semibold text-student-primary mb-3 flex items-center">
                📝 Product Details
              </h3>
              <div className="prose prose-gray">
                <p className="text-lg text-student-secondary leading-relaxed">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Purchase Buttons - StudentStore Enhanced */}
            <div className="space-y-4 bg-student-card rounded-xl p-6 border border-border-light shadow-md">
              <h3 className="text-lg font-semibold text-student-primary mb-4 flex items-center">
                🛒 Get this product - Student Verified Sources:
              </h3>
              
              {/* Primary Button - Enhanced */}
              <a
                href={product.buy_button_1_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-student-blue to-student-green hover:from-student-blue/90 hover:to-student-green/90 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center group"
              >
                <span className="flex items-center">
                  <span className="mr-2">🚀</span>
                  {product.buy_button_1_name}
                  <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </a>

              {/* Secondary Buttons - Enhanced */}
              {product.buy_button_2_name && product.buy_button_2_url && (
                <a
                  href={product.buy_button_2_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-student-card hover:bg-student-light text-student-primary py-3 px-6 rounded-xl font-medium border-2 border-student-blue/30 hover:border-student-blue transition-all duration-200 flex items-center justify-center group shadow-md hover:shadow-lg"
                >
                  <span className="flex items-center">
                    <span className="mr-2">🛍️</span>
                    {product.buy_button_2_name}
                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </a>
              )}

              {product.buy_button_3_name && product.buy_button_3_url && (
                <a
                  href={product.buy_button_3_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-student-card hover:bg-student-light text-student-primary py-3 px-6 rounded-xl font-medium border-2 border-student-green/30 hover:border-student-green transition-all duration-200 flex items-center justify-center group shadow-md hover:shadow-lg"
                >
                  <span className="flex items-center">
                    <span className="mr-2">💰</span>
                    {product.buy_button_3_name}
                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </a>
              )}
            </div>

            {/* Student Trust Indicators - Enhanced */}
            <div className="bg-gradient-to-r from-student-blue/10 to-student-green/10 rounded-xl p-6 border border-student-blue/20">
              <h4 className="text-sm font-semibold text-student-primary mb-3 flex items-center">
                🎓 Why Students Choose This Product:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-student-green mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-student-primary font-medium">Student Verified</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-student-blue mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  </svg>
                  <span className="text-student-primary font-medium">Price Compared</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-student-orange mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-student-primary font-medium">Top Rated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section - Enhanced StudentStore Style */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="bg-student-card rounded-2xl p-6 border border-border-light shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-student-primary mb-6 flex items-center">
            💬 Student Reviews & Opinions
          </h2>
          <p className="text-student-secondary mb-8">Real feedback from fellow students who've used this product</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Review Manager */}
            <div className="lg:col-span-1">
              <ReviewManager
                productId={product.id}
                productName={product.name}
                onReviewSubmitted={handleReviewUpdate}
              />
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2">
              <ReviewList
                productId={product.id}
                key={`${product.id}-${reviewRefreshKey}`}
                onReviewUpdate={handleReviewUpdate}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Related Products - Enhanced */}
      {related_products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-student-primary mb-4 flex items-center justify-center">
              <span className="mr-3">🔗</span>
              Students Also Viewed
            </h2>
            <p className="text-student-secondary text-lg">More popular products from {product.category_name}</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {related_products.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
