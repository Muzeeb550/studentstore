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

interface RecentlyViewedCardProps {
  product: Product;
  viewedAt: number;
}

export default function RecentlyViewedCard({ product, viewedAt }: RecentlyViewedCardProps) {
  const getProductImage = (imageUrls: string) => {
    try {
      const urls = JSON.parse(imageUrls);
      return urls[0] || '/placeholder-product.jpg';
    } catch {
      return '/placeholder-product.jpg';
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return minutes <= 1 ? 'Just now' : `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleProductClick = () => {
    addToRecentlyViewed(product);
  };

  return (
    <Link href={`/products/${product.id}`} className="group cursor-pointer touch-optimized" onClick={handleProductClick}>
      <div className="recently-viewed-card">
        {/* Image Container */}
        <div className="recently-viewed-image-container">
          <img 
            src={getProductImage(product.image_urls)} 
            alt={product.name}
            className="recently-viewed-image"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC01IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Time Badge */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
            <span className="bg-student-blue/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
              🕒 {getTimeAgo(viewedAt)}
            </span>
          </div>

          {/* Continue Badge */}
          {/* <div style={{ position: 'absolute', top: '10px', right: '60px', zIndex: 10 }}>
            <span className="bg-gradient-to-r from-cyan-500 to-student-blue text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
              Continue
            </span>
          </div> */}
          
          {/* Wishlist Button */}
          <div 
            onClick={handleWishlistClick}
            style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
          >
            <WishlistButton 
              productId={product.id}
              size="lg"
              className="shadow-xl hover:shadow-2xl transition-shadow duration-200"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="recently-viewed-info">
          <h4 className="recently-viewed-title">
            {product.name}
          </h4>
          
          <p className="recently-viewed-description">
            {product.description}
          </p>

          {/* Context */}
          {/* <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.75rem' }}>
            <div className="flex items-center text-student-blue">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium">Pick up here</span>
            </div>
            
            <div className="text-student-secondary text-xs">
              Don't lose this!
            </div>
          </div> */}

          {/* CTA */}
          <button className="recently-viewed-cta">
            <span className="flex items-center justify-center">
              Continue
              <svg className="ml-2 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    </Link>
  );
}
