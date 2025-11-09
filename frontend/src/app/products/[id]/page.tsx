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
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useWishlist } from '../../context/WishlistContext'; // ✅ ADD THIS LINE
import logger from '../../utils/logger';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;  // ✅ ADD THIS
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
  rating_average: number | string | null;
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
  rating_average: number | string | null;
  review_count: number;
}

interface ProductPageData {
  product: Product;
  related_products: RelatedProduct[];
}

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
  const [userName, setUserName] = useState<string>('Student'); // ✅ ADDED
  const { checkMultipleProducts } = useWishlist(); // ✅ ADD THIS LINE

  
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    reviews: false,
    relatedProducts: false
  });

  // 🚀 NEW: Image lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);

  // 🚀 NEW: Social proof data
  const [socialProofData, setSocialProofData] = useState({
    recentViews: 0,
    weeklyWishlists: 0,
    isTrending: false,
    isTopChoice: false
  });

  // 🚀 NEW: Touch gesture handling
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const CACHE_CONFIG = {
    ttl: 5 * 60 * 1000,
  };

  useEffect(() => {
    if (productId) {
      initializeProductPage();
    }
  }, [productId]);

  // ✅ NEW: Fetch user name for personalized messages
  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || user.display_name || 'Student');
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  }, []);

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

  // 🚀 NEW: Calculate social proof data
  useEffect(() => {
    if (data?.product) {
      const product = data.product;
      
      const recentViewsEstimate = Math.floor(product.views_count * 0.15) + Math.floor(Math.random() * 20);
      
      const avgRating = getSafeRating(product.rating_average);
      const weeklyWishlistsEstimate = Math.floor(product.review_count * 0.8) + 
                                      Math.floor(avgRating * 5) + 
                                      Math.floor(Math.random() * 15);
      
      const isTrending = product.views_count > 100 && avgRating >= 4.0;
      const isTopChoice = avgRating >= 4.5 && product.review_count >= 10;
      
      setSocialProofData({
        recentViews: Math.max(recentViewsEstimate, 15),
        weeklyWishlists: Math.max(weeklyWishlistsEstimate, 8),
        isTrending,
        isTopChoice
      });
    }
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkAndRefreshExpiredCache();
    }, 30000);

    return () => clearInterval(interval);
  }, [productId]);

  // 🚀 NEW: Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft' && lightboxImageIndex > 0) {
        prevImage();
      } else if (e.key === 'ArrowRight' && lightboxImageIndex < images.length - 1) {
        nextImage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, lightboxImageIndex, images.length]);

  const initializeProductPage = async () => {
    try {
      const cachedData = loadFromCache();
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setLoadingStates({ initial: false, reviews: false, relatedProducts: false });
        console.log(`🚀 Product ${productId} loaded from cache (instant display)`);
        
        const age = Date.now() - getCacheTimestamp();
        if (age > 120000) {
          await fetchProductDetails(false);
        }
      } else {
        await fetchProductDetails(true);
      }
    } catch (error) {
      console.error('Product initialization error:', error);
      await fetchProductDetails(true);
    }
  };

  const loadFromCache = (): ProductPageData | null => {
    try {
      const cacheKey = `studentstore_product_${productId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < CACHE_CONFIG.ttl) {
          console.log(`📊 Cache hit for product ${productId} (age: ${Math.floor(age/1000)}s)`);
          return data;
        } else {
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

  const checkAndRefreshExpiredCache = useCallback(async () => {
    if (!data || !productId) return;
    
    const age = Date.now() - getCacheTimestamp();
    
    if (age >= CACHE_CONFIG.ttl) {
      console.log('🔄 Background refresh triggered for expired product cache');
      await fetchProductDetails(false);
    }
  }, [productId, data]);

  const forceRefresh = useCallback(async () => {
    console.log(`🚀 Force refresh product ${productId}`);
    
    const cacheKey = `studentstore_product_${productId}`;
    localStorage.removeItem(cacheKey);
    
    await fetchProductDetails(false);
  }, [productId]);

  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type, productId: updatedProductId } = event.detail;
      
      if (type === 'product' || type === 'review' || 
          (updatedProductId && updatedProductId === parseInt(productId))) {
        console.log('🔄 Admin update detected for product:', event.detail);
        forceRefresh();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    return () => window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
  }, [productId, forceRefresh]);

  useEffect(() => {
    const handleReviewUpdate = (event: CustomEvent) => {
      const { productId: reviewProductId } = event.detail;
      
      if (reviewProductId === parseInt(productId)) {
        console.log('🔄 Review update detected, refreshing product data');
        forceRefresh();
        setReviewRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('reviewUpdate' as any, handleReviewUpdate);
    return () => window.removeEventListener('reviewUpdate' as any, handleReviewUpdate);
  }, [productId, forceRefresh]);

  const fetchProductDetails = async (showMainLoading: boolean = true) => {
    try {
      if (showMainLoading) {
        setLoading(true);
        setLoadingStates({ initial: true, reviews: false, relatedProducts: false });
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
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
        saveToCache(productData);
        console.log(`🔄 Product ${productId} updated from API`);
        
        // ✅ BATCH CHECK WISHLIST FOR PRODUCT + RELATED PRODUCTS
        const allProductIds = [
          productData.product.id,
          ...(productData.related_products?.map((p: RelatedProduct) => p.id) || [])
        ];
        
        if (allProductIds.length > 0) {
          logger.debug(`Batch checking wishlist for ${allProductIds.length} products (detail page)`);
          await checkMultipleProducts(allProductIds);
        }
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

  const handleReviewUpdate = useCallback(() => {
    const cacheKey = `studentstore_product_${productId}`;
    localStorage.removeItem(cacheKey);
    
    fetchProductDetails(false);
    setReviewRefreshKey(prev => prev + 1);
    
    window.dispatchEvent(new CustomEvent('reviewUpdate', {
      detail: { productId: parseInt(productId) }
    }));
    
    console.log('📝 Review updated, product cache invalidated');
  }, [productId]);

 // ✅ FIXED: Lightbox handlers with proper cleanup
const openLightbox = (index: number) => {
  setLightboxImageIndex(index);
  setIsLightboxOpen(true);
};

const closeLightbox = () => {
  setIsLightboxOpen(false);
};

// ✅ FIXED: Auto-cleanup scroll lock on unmount or lightbox close
useEffect(() => {
  if (isLightboxOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }
  
  // Always restore scroll when component unmounts (user navigates away)
  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isLightboxOpen]);


// ✅ FIXED: Auto-cleanup scroll lock on unmount or lightbox close
useEffect(() => {
  if (isLightboxOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }
  
  // Always restore scroll when component unmounts (user navigates away)
  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isLightboxOpen]);

// ✅ NEW: Reset lightbox state on component unmount
useEffect(() => {
  return () => {
    // Clean up lightbox state when leaving page
    setIsLightboxOpen(false);
    setLightboxImageIndex(0);
    document.body.style.overflow = 'unset';
  };
}, []);


  const nextImage = () => {
    setLightboxImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setLightboxImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // 🚀 NEW: Touch gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
    
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  // 🚀 NEW: Share product
  const handleShareProduct = async () => {
    if (navigator.share && data?.product) {
      try {
        await navigator.share({
          title: data.product.name,
          text: `Check out this product: ${data.product.description}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

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
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const getSafeRating = (rating: number | string | null): number => {
    if (!rating) return 0;
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(numRating) ? 0 : numRating;
  };

  const getSafeRatingDisplay = (rating: number | string | null): string => {
    if (!rating) return '0.0';
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    return isNaN(numRating) ? '0.0' : numRating.toFixed(1);
  };

  const ProductSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="animate-pulse bg-gray-200 h-96 rounded-2xl"></div>
          <div className="flex space-x-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg flex-1"></div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="animate-pulse bg-gray-200 h-8 rounded w-3/4"></div>
          <div className="animate-pulse bg-gray-200 h-12 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-24 rounded"></div>
          <div className="animate-pulse bg-gray-200 h-16 rounded"></div>
        </div>
      </div>
    </div>
  );

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

 // ✅ MOBILE-OPTIMIZED: Review Encouragement Messages Component
const ReviewEncouragementBanner = ({ variant = 'compact' }: { variant?: 'compact' | 'detailed' }) => {
  const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('studentstore_token');
  
  if (!isLoggedIn) return null;

  const scrollToReviews = () => {
    const reviewSection = document.querySelector('#reviews-section');
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-student-blue/10 via-student-green/10 to-student-orange/10 rounded-lg md:rounded-xl p-3 md:p-4 mb-4 md:mb-6 border-2 border-student-blue/30 shadow-lg animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Icon + Text */}
          <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1">
            <div className="bg-student-blue/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base text-student-primary font-medium leading-tight">
                Hey <span className="font-bold text-student-blue">{userName}</span>! 👋 Have you used this product?
              </p>
              <p className="text-xs sm:text-sm text-student-secondary mt-0.5 sm:mt-1 leading-snug">
                Share your honest experience - your review could help thousands of students! ✍️
              </p>
            </div>
          </div>
          
          {/* Button */}
          <button
            onClick={scrollToReviews}
            className="w-full sm:w-auto bg-student-blue hover:bg-student-blue/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 whitespace-nowrap"
          >
            Write Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-student-blue/10 via-student-green/5 to-student-orange/10 rounded-xl md:rounded-2xl p-5 sm:p-6 md:p-8 mb-6 md:mb-8 border-2 border-student-green/30 shadow-xl">
      <div className="text-center max-w-3xl mx-auto">
        {/* Header with Icon */}
        <div className="flex items-center justify-center mb-3 sm:mb-4">
          <div className="bg-student-green/20 p-2 sm:p-3 rounded-full mr-2 sm:mr-3">
            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary">
            Hey <span className="text-student-blue">{userName}</span>! 👋
          </h3>
        </div>
        
        {/* Main Message */}
        <p className="text-sm sm:text-base md:text-lg text-student-primary mb-2 sm:mb-3 leading-relaxed px-2">
          Have you tried this product? Share your honest experience with fellow students - 
          <span className="font-semibold text-student-green"> whether you loved it or not</span>, 
          your review helps others make smarter choices.
        </p>
        
        {/* Safe Space Badge */}
        <div className="bg-student-green/10 border border-student-green/30 rounded-lg md:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm md:text-base text-student-primary font-medium flex items-center justify-center flex-wrap gap-1">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-student-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-center">
              This is a <span className="font-bold text-student-green">judgment-free student community</span> - your real opinion matters!
            </span>
          </p>
        </div>
        
        {/* CTA Button */}
        <button
          onClick={scrollToReviews}
          className="bg-gradient-to-r from-student-blue to-student-green hover:from-student-blue/90 hover:to-student-green/90 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center mx-auto group w-full sm:w-auto"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Write Your Review
        </button>
      </div>
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

      {process.env.NODE_ENV === 'development' && <CacheStatusIndicator />}

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
        
        {/* ✅ MESSAGE 1: Quick Review Encouragement */}
        <ReviewEncouragementBanner variant="compact" />
      </div>

      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* 🚀 ENHANCED Product Images */}
          <div className="space-y-4">
            <div 
              className="bg-student-card rounded-2xl p-4 shadow-xl border border-border-light relative group cursor-zoom-in"
              onClick={() => openLightbox(currentImageIndex)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={getImageSrc(images[currentImageIndex] || '')}
                alt={product.name}
                className="w-full h-96 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getImageSrc('');
                }}
              />
              
              {/* Zoom Indicator */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-black/60 text-white px-4 py-2 rounded-full flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  <span className="text-sm font-medium">Click to zoom</span>
                </div>
              </div>
              
              {images.length > 1 && (
                <div className="absolute top-6 left-6 bg-student-primary/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              )}
              
              {/* Mobile Share Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareProduct();
                }}
                className="absolute top-6 right-6 md:hidden bg-white/90 hover:bg-white text-student-primary p-2 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
                title="Share Product"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
              </button>
              
              {/* Swipe Indicator */}
              {images.length > 1 && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 md:hidden bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  <span>Swipe</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 bg-student-card rounded-lg p-2 shadow-md transition-all duration-200 border ${
                      currentImageIndex === index 
                        ? 'ring-2 ring-student-blue border-student-blue scale-105' 
                        : 'hover:shadow-lg hover:scale-102 border-border-light'
                    }`}
                  >
                    <img
                      src={getImageSrc(image)}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-16 object-cover rounded-md"
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

          {/* Product Info */}
          <div className="space-y-6">
            {/* 🚀 NEW: Social Proof Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {socialProofData.isTrending && (
                <div className="flex items-center bg-gradient-to-r from-student-orange to-warning text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg animate-pulse">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  🔥 Trending
                </div>
              )}
              
              {socialProofData.isTopChoice && (
                <div className="flex items-center bg-gradient-to-r from-student-green to-success text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Top Choice
                </div>
              )}
              
              <div className="flex items-center bg-gradient-to-r from-student-blue to-student-green text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                📂 {product.category_name}
              </div>
            </div>

            {/* 🚀 NEW: Social Proof Stats */}
            <div className="bg-gradient-to-r from-student-blue/10 via-student-green/10 to-student-orange/10 rounded-xl p-4 mb-6 border border-student-blue/20">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="bg-student-blue/20 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-student-primary">{socialProofData.recentViews}+ students</p>
                    <p className="text-xs text-student-secondary">viewed in 24 hours</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="bg-student-orange/20 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-student-orange" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-student-primary">{socialProofData.weeklyWishlists}+ added</p>
                    <p className="text-xs text-student-secondary">to wishlists this week</p>
                  </div>
                </div>
              </div>
            </div>

           <div>
            {/* Product Title - Responsive */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-student-primary leading-tight mb-3 sm:mb-4">
              {product.name}
            </h1>
            
            {/* Price Badge - Fully Responsive (No Decimals) */}
            <div className="inline-flex items-baseline space-x-2 bg-gradient-to-r from-student-green/10 to-emerald-600/10 px-4 py-2 rounded-lg border-2 border-student-green/30">
              <span className="text-sm sm:text-base md:text-lg text-gray-600 font-medium">Price:</span>
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-student-green">
                ₹{product.price ? Math.round(parseFloat(product.price.toString())).toLocaleString('en-IN') : '0'}
              </span>
            </div>
          </div>


            <div className="bg-student-card rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 border border-border-light shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                {/* Left: Rating & Reviews */}
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    {/* Stars */}
                    <StarRating 
                      rating={getSafeRating(product.rating_average)} 
                      showRatingText={false}
                      size="sm"
                    />
                    
                    {/* Rating Number */}
                    <span className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary whitespace-nowrap">
                      {getSafeRatingDisplay(product.rating_average)}
                    </span>
                    
                    {/* Review Count - Stack on mobile */}
                    <span className="text-xs sm:text-sm md:text-base text-student-secondary whitespace-nowrap">
                      ({product.review_count} reviews)
                    </span>
                  </div>
                </div>
                
                {/* Divider - Hidden on mobile */}
                <div className="hidden sm:block h-8 w-px bg-border-light"></div>
                
                {/* Right: Views - Stack on mobile */}
                <div className="flex items-center gap-2 sm:gap-3 text-student-secondary text-xs sm:text-sm md:text-base whitespace-nowrap">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium text-student-primary">
                    {product.views_count.toLocaleString()}
                  </span>
                  <span className="hidden sm:inline">students viewed</span>
                </div>
              </div>
            </div>

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

            <div className="bg-gradient-to-br from-student-card via-student-light to-student-card rounded-xl p-6 sm:p-8 border border-border-light shadow-lg">
              <h3 className="text-xl sm:text-2xl font-bold text-student-primary mb-4 flex items-center">
                📝 Product Details
              </h3>
              <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4 sm:p-6">
                <p className="text-base sm:text-lg md:text-xl text-student-primary leading-loose whitespace-pre-line font-semibold tracking-tight">
                  {product.description}
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-student-card rounded-xl p-6 border border-border-light shadow-md">
              <h3 className="text-lg font-semibold text-student-primary mb-4 flex items-center">
                🛒 Get this product - Student Verified Sources:
              </h3>
              
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </span>
                </a>
              )}
              {/* ✅ URGENCY MESSAGE - Above Buy Buttons */}
              <div className="bg-gradient-to-r from-student-orange/10 to-warning/10 border-2 border-student-orange/30 rounded-lg md:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-md">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  <div className="bg-student-orange/20 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-student-orange" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base md:text-lg font-bold text-student-orange mb-0.5 sm:mb-1 leading-tight">
                      ⚡ Buy Now - Prices Change Fast!
                    </p>
                    <p className="text-xs sm:text-sm text-student-secondary leading-snug sm:leading-relaxed">
                      Prices fluctuate daily. Grab this deal before it's gone! 🚀
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
        {/* ✅ TRANSPARENCY MESSAGE - Below Buy Buttons */}
        <div className="bg-student-blue/5 border border-student-blue/20 rounded-lg md:rounded-xl p-2.5 sm:p-3 md:p-4 mt-3 sm:mt-4">
          <div className="flex items-start space-x-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-student-blue flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs sm:text-sm text-student-secondary leading-snug sm:leading-relaxed">
              <span className="font-semibold text-student-primary">💡 Price Note:</span> We compare student-friendly platforms to show you the best deals. Prices vary by time and availability - always verify final price at checkout.
            </p>
          </div>
        </div>
      </section>

      {/* ✅ MESSAGE 2: Detailed Safe Space Message */}
      <section className="max-w-7xl mx-auto px-4 mb-8">
        <ReviewEncouragementBanner variant="detailed" />
      </section>

      <section className="max-w-7xl mx-auto px-4 mb-8 md:mb-12 lg:mb-16" id="reviews-section">
        <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 md:p-6 border border-border-light shadow-xl">
          {/* Header - Responsive */}
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-student-primary mb-2 sm:mb-3 md:mb-4 lg:mb-6 flex items-center gap-2 flex-wrap">
            <span>💬</span>
            <span className="break-words">Student Reviews & Opinions</span>
          </h2>
          
          {/* Description - Responsive */}
          <p className="text-xs sm:text-sm md:text-base text-student-secondary mb-4 sm:mb-6 md:mb-8 leading-relaxed">
            Real feedback from fellow students who've used this product
          </p>
          
          {/* Grid - Responsive Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* ReviewManager - Left Column */}
            <div className="md:col-span-1">
              <div className="sticky top-20 md:top-24">
                <ReviewManager
                  productId={product.id}
                  productName={product.name}
                  onReviewSubmitted={handleReviewUpdate}
                />
              </div>
            </div>

            {/* ReviewList - Right Column */}
            <div className="md:col-span-2">
              <ReviewList
                productId={product.id}
                key={`${product.id}-${reviewRefreshKey}`}
                onReviewUpdate={handleReviewUpdate}
              />
            </div>
          </div>
        </div>
      </section>


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
           {/* ✅ NEW: VIEW ALL PRODUCTS Button */}
          <div className="flex justify-center mt-12">
            <a
              href={`/categories/${product.category_id}`}
              className="bg-gradient-to-r from-student-blue to-student-green hover:from-student-blue/90 hover:to-student-green/90 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 flex items-center space-x-2"
            >
              <span>📂 View All {product.category_name} Products</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </section>
      )}

      {/* ✅ ENHANCED: Image Lightbox with Zoom + Swipe Support */}
{isLightboxOpen && (
  <div 
    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
    onClick={closeLightbox}
  >
    {/* Close Button */}
    <button
      onClick={closeLightbox}
      className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
    >
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    {/* Share Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleShareProduct();
      }}
      className="absolute top-4 right-16 text-white hover:text-gray-300 transition-colors z-50"
    >
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
      </svg>
    </button>
    
    {/* Image Counter */}
    <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium z-50">
      {lightboxImageIndex + 1} / {images.length}
    </div>
    
    {/* Previous Button - Swipeable Area */}
    {images.length > 1 && lightboxImageIndex > 0 && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          prevImage();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          setTouchStart(touch.clientX);
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          setTouchEnd(touch.clientX);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (!touchStart || !touchEnd) return;
          
          const distance = touchStart - touchEnd;
          
          // Right swipe on left button = previous image
          if (distance < -50) {
            prevImage();
          }
          
          setTouchStart(0);
          setTouchEnd(0);
        }}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    )}
    
    {/* ✅ Swipeable Side Panels for Navigation */}
    {images.length > 1 && (
      <>
        {/* Left Swipe Area - Previous Image */}
        {lightboxImageIndex > 0 && (
          <div
            className="absolute left-0 top-0 bottom-0 w-20 z-40 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              setTouchStart(touch.clientX);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              setTouchEnd(touch.clientX);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              if (!touchStart || !touchEnd) return;
              
              const distance = touchStart - touchEnd;
              
              // Right swipe = previous
              if (distance < -50) {
                prevImage();
              }
              
              setTouchStart(0);
              setTouchEnd(0);
            }}
          />
        )}
        
        {/* Right Swipe Area - Next Image */}
        {lightboxImageIndex < images.length - 1 && (
          <div
            className="absolute right-0 top-0 bottom-0 w-20 z-40 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              setTouchStart(touch.clientX);
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
              const touch = e.touches[0];
              setTouchEnd(touch.clientX);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              if (!touchStart || !touchEnd) return;
              
              const distance = touchStart - touchEnd;
              
              // Left swipe = next
              if (distance > 50) {
                nextImage();
              }
              
              setTouchStart(0);
              setTouchEnd(0);
            }}
          />
        )}
      </>
    )}
    
    {/* Zoomable Image */}
    <div 
      className="w-full h-full flex items-center justify-center p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={4}
        doubleClick={{
          mode: "toggle",
          step: 0.7
        }}
        wheel={{
          step: 0.2
        }}
        pinch={{
          step: 5
        }}
        panning={{
          velocityDisabled: true
        }}
      >
        <TransformComponent
          wrapperStyle={{
            width: "100%",
            height: "100%",
            maxWidth: "90vw",
            maxHeight: "90vh"
          }}
          contentStyle={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <img
            src={getImageSrc(images[lightboxImageIndex] || '')}
            alt={`${product.name} ${lightboxImageIndex + 1}`}
            style={{
              maxWidth: "100%",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: "8px"
            }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = getImageSrc('');
            }}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
    
    {/* Next Button - Swipeable Area */}
    {images.length > 1 && lightboxImageIndex < images.length - 1 && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          nextImage();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          setTouchStart(touch.clientX);
        }}
        onTouchMove={(e) => {
          e.stopPropagation();
          const touch = e.touches[0];
          setTouchEnd(touch.clientX);
        }}
        onTouchEnd={(e) => {
          e.stopPropagation();
          if (!touchStart || !touchEnd) return;
          
          const distance = touchStart - touchEnd;
          
          // Left swipe on right button = next image
          if (distance > 50) {
            nextImage();
          }
          
          setTouchStart(0);
          setTouchEnd(0);
        }}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-all z-50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    )}
    
    {/* Instructions */}
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium z-50">
      <span className="hidden md:inline">Double-click to zoom | Scroll wheel | Drag to pan | ← → arrows | ESC to close</span>
      <span className="md:hidden">🤏 Pinch zoom | 👆 Double-tap | Drag pan | 👈👉 Swipe sides | Tap       Here ❌ to close</span>
    </div>
  </div>
)}
      <Footer />
    </div>
  );
}
