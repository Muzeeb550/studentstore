import Link from 'next/link';

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

  const handlePurchaseClick = (e: React.MouseEvent) => {
    // Prevent navigation to product page when clicking purchase button
    e.stopPropagation();
  };

  return (
    <Link href={`/products/${product.id}`} className="group cursor-pointer">
      <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 group-hover:scale-105 transform">
        {/* Product Image */}
        <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
          <img 
            src={getProductImage(product.image_urls)} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTMwQzg1LjUgMTMwIDc0IDExOC41IDc0IDEwNEM3NCA4OS41IDg1LjUgNzggMTAwIDc4QzExNC41IDc4IDEyNiA4OS41IDEyNiAxMDRDMTI2IDExOC41IDExNC41IDEzMCAxMDAgMTMwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
              {product.category_name}
            </span>
          </div>
          
          {/* Wishlist Button */}
          <button 
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors duration-200 opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4 text-gray-600 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Product Info */}
        <div className="p-6">
          <h4 className="font-bold text-gray-900 text-lg mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors duration-200">
            {product.name}
          </h4>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {/* View Details Button */}
          <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 text-center shadow-lg hover:shadow-xl transform hover:scale-105">
            View Details
          </div>
        </div>
      </div>
    </Link>
  );
}
