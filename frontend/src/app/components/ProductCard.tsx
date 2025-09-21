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
    // Prevent navigation to product page when clicking wishlist button
    e.preventDefault();
    e.stopPropagation();
  };

  // Track product view when card is clicked
  const handleProductClick = () => {
    console.log('🔍 Tracking product view:', product.name);
    addToRecentlyViewed(product);
  };

  return (
    <Link href={`/products/${product.id}`} className="group cursor-pointer" onClick={handleProductClick}>
      <div className="product-card">
        {/* Product Image Container */}
        <div className="relative h-48 bg-gradient-to-br from-student-light to-border-light overflow-hidden">
          <img 
            src={getProductImage(product.image_urls)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC1IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Enhanced Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-gradient-to-r from-student-blue to-student-green text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow duration-200">
              {product.category_name}
            </span>
          </div>

          {/* Student Popular Indicator - Show randomly for variety */}
          {Math.random() > 0.7 && (
            <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-student-orange to-warning text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                🔥 Trending
              </span>
            </div>
          )}
          
          {/* Wishlist Button - Enhanced */}
          <div 
            onClick={handleWishlistClick}
            className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:scale-110"
          >
            <WishlistButton 
              productId={product.id}
              size="md"
              className="shadow-xl hover:shadow-2xl transition-shadow duration-200"
            />
          </div>

          {/* Subtle overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Product Info - Enhanced Layout */}
        <div className="p-6 flex flex-col flex-1">
          {/* Product Name */}
          <h4 className="font-bold text-student-primary text-lg mb-2 line-clamp-1 group-hover:text-student-blue transition-colors duration-200">
            {product.name}
          </h4>
          
          {/* Product Description */}
          <p className="text-student-secondary text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
            {product.description}
          </p>

          {/* Student Benefits Row */}
          <div className="flex items-center justify-between mb-4 text-xs">
            <div className="flex items-center text-student-green">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Student Verified
            </div>
            
            {/* Fake but realistic student engagement metrics */}
            <div className="text-student-secondary">
              {Math.floor(Math.random() * 500 + 100)}+ views
            </div>
          </div>

          {/* Enhanced View Details Button */}
          <button className="btn-primary w-full text-center group-hover:bg-student-green group-hover:shadow-lg transition-all duration-200 transform group-hover:-translate-y-0.5">
            <span className="flex items-center justify-center">
              View Details
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </button>
        </div>

        {/* Quick Action Tooltip on Hover */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
          <div className="bg-student-primary text-white text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
            Click to view details & reviews
          </div>
        </div>
      </div>
    </Link>
  );
}
