'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import WishlistButton from '../../components/WishlistButton';
import Footer from '../../components/Footer';
import StarRating from '../../components/StarRating';
import ReviewForm from '../../components/ReviewForm';
import ReviewList from '../../components/ReviewList';
import ReviewManager from '../../components/ReviewManager';

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
  rating_average: number | null; // FIXED: Allow null values
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
  rating_average: number | null; // FIXED: Allow null values
  review_count: number;
}

interface ProductPageData {
  product: Product;
  related_products: RelatedProduct[];
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

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

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

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/public/products/${productId}`);
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load product details');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewUpdate = () => {
    // Refresh product data to update rating counts
    fetchProductDetails();
    // Trigger review list refresh
    setReviewRefreshKey(prev => prev + 1);
  };

  const getImageSrc = (imageUrl: string) => {
    return imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMjYwQzE3MSAyNjAgMTQ4IDIzNyAxNDggMjA4QzE0OCAxNzkgMTcxIDE1NiAyMDAgMTU2QzIyOSAxNTYgMjUyIDE3OSAyNTIgMjA4QzI1MiAyMzcgMjI5IDI2MCAyMDAgMjYwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
  };

  const handleShare = async () => {
    if (navigator.share && data?.product) {
      try {
        await navigator.share({
          title: data.product.name,
          text: data.product.description,
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

  // FIXED: Helper functions for safe rating display
  const getSafeRating = (rating: number | null): number => {
    return rating ?? 0;
  };

  const getSafeRatingDisplay = (rating: number | null): string => {
    return rating ? rating.toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchProductDetails}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📦</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
            <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
            <a
              href="/"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { product, related_products } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 pt-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <a href="/" className="hover:text-indigo-600 transition-colors">
            Home
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <a href={`/categories/${product.category_id}`} className="hover:text-indigo-600 transition-colors">
            {product.category_name}
          </a>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-indigo-600 font-medium">{product.name}</span>
        </nav>
      </div>

      {/* Product Details */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <img
                src={getImageSrc(images[currentImageIndex] || '')}
                alt={product.name}
                className="w-full h-96 object-cover rounded-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = getImageSrc('');
                }}
              />
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="flex space-x-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-1 bg-white rounded-lg p-2 shadow-md transition-all duration-200 ${
                      currentImageIndex === index 
                        ? 'ring-2 ring-indigo-600 ring-offset-2' 
                        : 'hover:shadow-lg'
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

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category Badge */}
            <span className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
              {product.category_name}
            </span>

            {/* Product Name */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              {product.name}
            </h1>

            {/* Rating and Views - FIXED: Added null safety */}
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <StarRating 
                  rating={getSafeRating(product.rating_average)} 
                  showRatingText={false}
                  size="sm"
                />
                <span className="ml-2">{getSafeRatingDisplay(product.rating_average)}</span>
                <span className="ml-1">({product.review_count} reviews)</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{product.views_count.toLocaleString()} views</span>
              </div>
            </div>

            {/* Wishlist and Share Actions */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex items-center space-x-2">
                <WishlistButton 
                  productId={product.id}
                  size="lg"
                  className="shadow-lg"
                />
                <span className="text-sm text-gray-600 font-medium">Save for later</span>
              </div>
              
              {/* Share Button */}
              <button 
                onClick={handleShare}
                className="flex items-center space-x-2 text-gray-600 hover:text-indigo-600 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>

            {/* Description */}
            <div className="prose prose-gray">
              <p className="text-lg text-gray-700 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Purchase Buttons */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Get this product:</h3>
              
              {/* Primary Button */}
              <a
                href={product.buy_button_1_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
              >
                <span>{product.buy_button_1_name}</span>
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              {/* Secondary Buttons */}
              {product.buy_button_2_name && product.buy_button_2_url && (
                <a
                  href={product.buy_button_2_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 py-3 px-6 rounded-xl font-medium border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 flex items-center justify-center"
                >
                  <span>{product.buy_button_2_name}</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}

              {product.buy_button_3_name && product.buy_button_3_url && (
                <a
                  href={product.buy_button_3_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 py-3 px-6 rounded-xl font-medium border-2 border-gray-200 hover:border-indigo-300 transition-all duration-200 flex items-center justify-center"
                >
                  <span>{product.buy_button_3_name}</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            {/* Additional Info */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Student Verified</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                  </svg>
                  <span>Compare Prices</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>Top Rated</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Review Manager - Write/Edit Reviews */}
          <div className="lg:col-span-1">
            <ReviewManager
              productId={product.id}
              productName={product.name}
              onReviewSubmitted={handleReviewUpdate}
            />
          </div>

          {/* Reviews List - Display All Reviews */}
          <div className="lg:col-span-2">
            <ReviewList
              productId={product.id}
              key={`${product.id}-${reviewRefreshKey}`} // This ensures fresh data when reviews are updated
              onReviewUpdate={handleReviewUpdate}
            />
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related_products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">You might also like</h2>
            <p className="text-gray-600 text-lg">More products from {product.category_name}</p>
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
