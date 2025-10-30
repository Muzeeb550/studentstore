import Link from 'next/link';
import WishlistButton from './WishlistButton';
import { addToRecentlyViewed } from '../utils/recentlyViewed';
import { optimizeProductImage, getFirstImageOrPlaceholder } from '../utils/imageOptimizer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  // ✅ OPTIMIZED: Get optimized image URL with proper size and quality
  const getProductImage = (imageUrls: string) => {
    const firstImage = getFirstImageOrPlaceholder(imageUrls, '/placeholder-product.jpg');
    // Optimize for medium size (800x800) - perfect for product cards
    return optimizeProductImage(firstImage, 'medium');
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleProductClick = () => {
    console.log('🔍 Tracking product view:', product.name);
    addToRecentlyViewed(product);
  };

  return (
    <Link href={`/products/${product.id}`} className="group cursor-pointer touch-optimized" onClick={handleProductClick}>
      <div className="product-card">
        {/* Product Image Container - 65% of card height */}
        <div className="product-image-container">
          {/* ✅ OPTIMIZED: Using optimized image with lazy loading and proper attributes */}
          <img 
            src={getProductImage(product.image_urls)} 
            alt={product.name}
            className="product-image"
            loading="lazy"
            decoding="async"
            width={800}
            height={800}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC41IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Category Badge */}
          <div className="product-badge product-badge-category">
            {product.category_name}
          </div>

          {/* Trending Badge */}
          {/* {Math.random() > 0.7 && (
            <div className="product-badge product-badge-trending" style={{ left: '50%', transform: 'translateX(-50%)' }}>
              🔥 Hot
            </div>
          )} */}
          
          {/* Wishlist Button */}
          <div 
            onClick={handleWishlistClick}
            className="product-wishlist"
          >
            <WishlistButton 
              productId={product.id}
              size="lg"
              className="shadow-xl hover:shadow-2xl transition-shadow duration-200"
            />
          </div>

          {/* Touch Feedback Overlay */}
          <div className="touch-overlay"></div>
        </div>

        {/* Product Info - 35% of card height */}
        <div className="product-info-container">
          {/* Product Title */}
          <h4 className="product-title">
            {product.name}
          </h4>
          
          {/* Description */}
          <p className="product-description">
            {product.description}
          </p>

          {/* Quick Stats Row */}
          {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem', minHeight: '16px' }}>
            <div className="flex items-center text-student-green">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Verified</span>
            </div>
            
            <div className="text-student-secondary text-xs">
              {Math.floor(Math.random() * 500 + 100)}+ views
            </div>
          </div> */}

          {/* CTA Button */}
          <button className="product-cta">
            <span className="flex items-center justify-center">
              View Details
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </Link>
  );
}
