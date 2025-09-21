'use client';

import { useState, useEffect, useRef } from 'react';
import Slider from 'react-slick';
import Navbar from './components/Navbar';
import CategoryCard from './components/CategoryCard';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';
import { getRecentlyViewed } from './utils/recentlyViewed';

// Import slick carousel CSS
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

interface Banner {
  id: number;
  name: string;
  media_url: string;
  link_url: string;
  display_order: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
  icon_url: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
}

interface RecentlyViewed {
  product: Product;
  viewedAt: number;
}

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewed[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs for manual navigation
  const categorySliderRef = useRef<any>(null);
  const recentlyViewedSliderRef = useRef<any>(null);
  const trendingSliderRef = useRef<any>(null);

  useEffect(() => {
    fetchPublicData();
    loadRecentlyViewed();
  }, []);

  // Add refresh interval for recently viewed (for testing)
  useEffect(() => {
    const interval = setInterval(() => {
      loadRecentlyViewed();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchPublicData = async () => {
    try {
      // Fetch banners
      const bannerRes = await fetch('http://localhost:5000/api/public/banners');
      const bannerData = await bannerRes.json();
      if (bannerData.status === 'success') {
        setBanners(bannerData.data);
      }

      // Fetch categories
      const categoryRes = await fetch('http://localhost:5000/api/public/categories');
      const categoryData = await categoryRes.json();
      if (categoryData.status === 'success') {
        setCategories(categoryData.data);
      }

      // Fetch trending products (will enhance with algorithm later)
      const productRes = await fetch('http://localhost:5000/api/public/products?limit=10');
      const productData = await productRes.json();
      if (productData.status === 'success') {
        // Use first 10 as trending for now
        setTrendingProducts(productData.data.products.slice(0, 10));
      }

      // Fetch featured products
      const featuredRes = await fetch('http://localhost:5000/api/public/products?limit=12');
      const featuredData = await featuredRes.json();
      if (featuredData.status === 'success') {
        setProducts(featuredData.data.products);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recently Viewed Products Management - Updated
  const loadRecentlyViewed = () => {
    const recentProducts = getRecentlyViewed();
    setRecentlyViewed(recentProducts);
    console.log('📚 Loaded recently viewed products:', recentProducts.length);
    
    // Debug: Log localStorage contents
    const stored = localStorage.getItem('studentstore_recently_viewed');
    if (stored) {
      console.log('🔍 Raw localStorage data:', JSON.parse(stored));
    }
  };

  // Custom Arrow Components - Positioned at EXTREME ENDS with StudentStore Colors
  const CustomPrevArrow = ({ onClick }: any) => (
    <button
      onClick={onClick}
      className="absolute top-1/2 left-2 z-20 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-200 hover:shadow-2xl hover:scale-110 transition-all duration-200 flex items-center justify-center group hover:bg-student-blue"
      aria-label="Previous"
    >
      <svg className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  const CustomNextArrow = ({ onClick }: any) => (
    <button
      onClick={onClick}
      className="absolute top-1/2 right-2 z-20 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl border border-gray-200 hover:shadow-2xl hover:scale-110 transition-all duration-200 flex items-center justify-center group hover:bg-student-blue"
      aria-label="Next"
    >
      <svg className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );

  // Banner carousel settings - With swipe buttons on EXTREME ENDS
  const bannerSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    pauseOnHover: true,
    dotsClass: "slick-dots custom-dots",
  };

  // Product carousel settings - With swipe buttons
  const productCarouselSettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 4,
    slidesToScroll: 2,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1280,
        settings: { slidesToShow: 3, slidesToScroll: 1 },
      },
      {
        breakpoint: 1024,
        settings: { slidesToShow: 2, slidesToScroll: 1 },
      },
      {
        breakpoint: 640,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  // Category slider settings - With swipe buttons
  const categorySettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 2,
    prevArrow: <CustomPrevArrow />,
    nextArrow: <CustomNextArrow />,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1280,
        settings: { slidesToShow: 4, slidesToScroll: 1 },
      },
      {
        breakpoint: 1024,
        settings: { slidesToShow: 3, slidesToScroll: 1 },
      },
      {
        breakpoint: 768,
        settings: { slidesToShow: 2, slidesToScroll: 1 },
      },
      {
        breakpoint: 480,
        settings: { slidesToShow: 1, slidesToScroll: 1 },
      },
    ],
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page flex items-center justify-center">
        <div className="text-center">
          <div className="loading-shimmer rounded-full h-16 w-16 mx-auto mb-4"></div>
          <p className="text-student-secondary font-medium">Loading StudentStore...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-student-page">
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Banner Carousel - With swipe buttons on EXTREME ENDS */}
      <section className="relative max-w-7xl mx-auto mt-8 px-4">
        <div className="rounded-2xl overflow-hidden shadow-2xl relative">
          {banners.length > 0 ? (
            <Slider {...bannerSettings}>
              {banners.map((banner) => (
                <div key={banner.id} className="relative">
                  <a
                    href={banner.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative"
                  >
                    {banner.media_url.includes('.mp4') || banner.media_url.includes('.webm') ? (
                      <video
                        src={banner.media_url}
                        autoPlay
                        muted
                        loop
                        className="w-full h-64 md:h-80 lg:h-96 xl:h-[500px] object-cover"
                      />
                    ) : (
                      <img
                        src={banner.media_url}
                        alt={banner.name}
                        className="w-full h-64 md:h-80 lg:h-96 xl:h-[500px] object-cover"
                      />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
                      <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                        {banner.name}
                      </h2>
                      <button className="btn-action inline-flex items-center">
                        Shop Now
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </button>
                    </div>
                  </a>
                </div>
              ))}
            </Slider>
          ) : (
            <div className="bg-student-hero h-64 md:h-80 lg:h-96 flex items-center justify-center rounded-2xl">
              <div className="text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome to StudentStore</h2>
                <p className="text-xl opacity-90">Your personal shopping companion for student life</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Recently Visited Products - "Continue with these so you won't miss" */}
      {recentlyViewed.length > 0 && (
        <section className="max-w-7xl mx-auto mt-16 px-4">
          <div className="mb-8">
            <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-2">
              Continue with these so you won't miss
            </h3>
            <p className="text-student-secondary text-lg">Pick up where you left off - don't lose these great finds!</p>
          </div>
          
          <div className="relative">
            <Slider {...productCarouselSettings}>
              {recentlyViewed.map((item) => (
                <div key={`recent-${item.product.id}-${item.viewedAt}`} className="px-2">
                  <ProductCard product={item.product} />
                </div>
              ))}
            </Slider>
          </div>
        </section>
      )}

      {/* 4. Trending Popular Products */}
      {trendingProducts.length > 0 && (
        <section className="max-w-7xl mx-auto mt-16 px-4">
          <div className="mb-8">
            <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-2">
              🔥 Trending Among Students
            </h3>
            <p className="text-student-secondary text-lg">What students are buying right now - join the trend!</p>
          </div>
          
          <div className="relative">
            <Slider {...productCarouselSettings}>
              {trendingProducts.map((product) => (
                <div key={`trending-${product.id}`} className="px-2">
                  <ProductCard product={product} />
                </div>
              ))}
            </Slider>
          </div>
        </section>
      )}

      {/* 5. Category Cards - With swipe buttons on both ends */}
      <section className="max-w-7xl mx-auto mt-16 px-4">
        <div className="mb-8">
          <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-2">Shop by Category</h3>
          <p className="text-student-secondary text-lg">Find exactly what you need for your student life</p>
        </div>
        
        {categories.length > 0 ? (
          <div className="relative">
            <Slider {...categorySettings}>
              {categories.map((category) => (
                <div key={category.id} className="px-2">
                  <CategoryCard category={category} />
                </div>
              ))}
            </Slider>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: '📚', name: 'Textbooks', desc: 'New & used books' },
              { icon: '💻', name: 'Electronics', desc: 'Laptops & gadgets' },
              { icon: '✏️', name: 'Stationery', desc: 'Pens & notebooks' },
              { icon: '🎒', name: 'Campus Gear', desc: 'Backpacks & more' },
              { icon: '📖', name: 'Courses', desc: 'Online learning' },
            ].map((category, index) => (
              <div key={index} className="category-card">
                <div className="text-4xl mb-4">{category.icon}</div>
                <h4 className="font-semibold text-student-primary mb-1">{category.name}</h4>
                <p className="text-sm text-student-secondary">{category.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 6. Featured Products - Will add category-wise later */}
      <section className="max-w-7xl mx-auto mt-16 px-4">
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-student-primary mb-4">
            Featured Products
          </h3>
          <p className="text-student-secondary text-lg max-w-2xl mx-auto">
            Handpicked products that students love, with the best deals and reviews
          </p>
        </div>
        
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h4 className="text-xl font-semibold text-student-primary mb-2">No products available</h4>
            <p className="text-student-secondary">Check back soon for amazing student deals!</p>
          </div>
        )}
      </section>

      {/* 7. Footer - Trust hub with social proof */}
      <Footer />
    </div>
  );
}
