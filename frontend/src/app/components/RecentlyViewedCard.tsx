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

  const imgSrc = getProductImage(product.image_urls);

  return (
    <>
      {/* Mobile: image-only tile (hidden on sm and up) */}
      <Link
        href={`/products/${product.id}`}
        onClick={handleProductClick}
        className="group cursor-pointer touch-optimized block sm:hidden"
        aria-label={product.name}
        style={{
          width: '140px',
          aspectRatio: '1 / 1',
          borderRadius: '12px',
          overflow: 'hidden',
          background: 'var(--bg-light)',
          position: 'relative'
        }}
      >
        {/* Optional small time badge for context; remove if you want pure image */}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2
          }}
          className="bg-student-blue/90 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-lg"
        >
          🕒 {getTimeAgo(viewedAt)}
        </span>

        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src =
              'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC01IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
          }}
        />
      </Link>

      {/* Tablet/desktop: full card (hidden on mobile) */}
      <Link
        href={`/products/${product.id}`}
        className="group cursor-pointer touch-optimized hidden sm:block"
        onClick={handleProductClick}
      >
        <div className="recently-viewed-card">
          {/* Image Container */}
          <div className="recently-viewed-image-container">
            <img
              src={imgSrc}
              alt={product.name}
              className="recently-viewed-image"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC01IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
              }}
            />

            {/* Time Badge */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
              <span className="bg-student-blue/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
                🕒 {getTimeAgo(viewedAt)}
              </span>
            </div>

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
    </>
  );
}
