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

interface TrendingCardProps {
  product: Product;
  trendingRank?: number;
}

export default function TrendingCard({ product, trendingRank = 1 }: TrendingCardProps) {
  const getProductImage = (imageUrls: string) => {
    try {
      const urls = JSON.parse(imageUrls);
      return urls[0] || '/placeholder-product.jpg';
    } catch {
      return '/placeholder-product.jpg';
    }
  };

  // Generate realistic trending data
  const getTrendingData = (rank: number) => {
    const baseGrowth = Math.floor(Math.random() * 40) + 20; // 20-60%
    const adjustedGrowth = Math.max(5, baseGrowth - (rank * 8)); // Higher rank = higher growth
    const soldToday = Math.floor(Math.random() * 200) + 50 + (10 - rank) * 15;
    
    return {
      growth: adjustedGrowth,
      soldToday,
      isRising: adjustedGrowth > 25
    };
  };

  const trendData = getTrendingData(trendingRank);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleProductClick = () => {
    addToRecentlyViewed(product);
  };

  return (
    <Link href={`/products/${product.id}`} className="group cursor-pointer product-card-touch-optimized" onClick={handleProductClick}>
      <div className="trending-card">
        {/* Enhanced Image Container with Trending Theme */}
        <div className="trending-image-container">
          <img 
            src={getProductImage(product.image_urls)} 
            alt={product.name}
            className="trending-image"
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC1IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Trending Rank Badge */}
          <div className="trending-rank-badge">
            <span className="bg-gradient-to-r from-student-orange to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
              #{trendingRank}
            </span>
          </div>

          {/* Growth Indicator */}
          <div className="trending-growth-badge">
            <span className={`${trendData.isRising ? 'bg-green-500' : 'bg-student-orange'} text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg flex items-center`}>
              +{trendData.growth}% 
              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </span>
          </div>

          {/* Hot Badge */}
          <div className="trending-hot-badge">
            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg animate-pulse">
              🔥 Hot
            </span>
          </div>
          
          {/* Enhanced Wishlist Button */}
          <div 
            onClick={handleWishlistClick}
            className="trending-wishlist"
          >
            <WishlistButton 
              productId={product.id}
              size="lg"
              className="shadow-xl hover:shadow-2xl transition-shadow duration-200"
            />
          </div>

          {/* Trending Pulse Overlay */}
          <div className="trending-pulse-overlay"></div>
        </div>

        {/* Enhanced Product Info */}
        <div className="trending-info">
          <h4 className="trending-title">
            {product.name}
          </h4>
          
          <p className="trending-description">
            {product.description}
          </p>

          {/* Social Proof */}
          <div className="trending-social-proof">
            <div className="flex items-center text-student-orange">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              <span className="text-xs font-medium">{trendData.soldToday} bought today</span>
            </div>
            
            <div className="text-red-600 text-xs font-medium">
              Rising fast! ⚡
            </div>
          </div>

          {/* FOMO CTA */}
          <button className="trending-cta">
            <span className="flex items-center justify-center">
              Join the Trend
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
