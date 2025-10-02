import Link from 'next/link';
import WishlistButton from './WishlistButton';
import { addToRecentlyViewed } from '../utils/recentlyViewed';

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
  const getProductImage = (imageUrls: string) => {
    try {
      const urls = JSON.parse(imageUrls);
      return urls[0] || '/placeholder-product.jpg';
    } catch {
      return '/placeholder-product.jpg';
    }
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
    <Link href={`/products/${product.id}`} className="group cursor-pointer product-card-touch-optimized" onClick={handleProductClick}>
      <div className="product-card-mobile">
        {/* Mobile-Optimized Product Image Container - 65% of card height */}
        <div className="product-image-container-mobile">
          <img 
            src={getProductImage(product.image_urls)} 
            alt={product.name}
            className="product-image-mobile"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC01IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Mobile-Optimized Category Badge */}
          <div className="product-category-badge-mobile">
            <span className="bg-gradient-to-r from-student-blue to-student-green text-white text-xs px-2 py-1 rounded-full font-semibold shadow-lg">
              {product.category_name}
            </span>
          </div>

          {/* Mobile-Optimized Trending Badge */}
          {Math.random() > 0.7 && (
            <div className="product-trending-badge-mobile">
              <span className="bg-gradient-to-r from-student-orange to-warning text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                🔥 Hot
              </span>
            </div>
          )}
          
          {/* Mobile-Optimized Wishlist Button - Always visible, larger touch target */}
          <div 
            onClick={handleWishlistClick}
            className="product-wishlist-mobile"
          >
            <WishlistButton 
              productId={product.id}
              size="lg"
              className="shadow-xl hover:shadow-2xl transition-shadow duration-200"
            />
          </div>

          {/* Mobile Touch Feedback Overlay */}
          <div className="product-touch-overlay-mobile"></div>
        </div>

        {/* Mobile-Optimized Product Info - 35% of card height */}
        <div className="product-info-container-mobile">
          {/* Product Title - Mobile Optimized */}
          <h4 className="product-title-mobile">
            {product.name}
          </h4>
          
          {/* Mobile-Optimized Description - Shorter for better UX */}
          <p className="product-description-mobile">
            {product.description}
          </p>

          {/* Mobile-Optimized Quick Stats Row */}
          <div className="product-stats-mobile">
            <div className="flex items-center text-student-green">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Verified</span>
            </div>
            
            <div className="text-student-secondary text-xs">
              {Math.floor(Math.random() * 500 + 100)}+ views
            </div>
          </div>

          {/* Mobile-Optimized CTA Button - Touch-friendly */}
          <button className="product-cta-mobile">
            <span className="flex items-center justify-center">
              View Details
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </button>
        </div>

        {/* Mobile-Optimized Quick Action Tooltip */}
        <div className="product-tooltip-mobile">
          <div className="bg-student-primary text-white text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
            Tap to view & buy
          </div>
        </div>
      </div>
    </Link>
  );
}
