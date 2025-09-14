'use client';

import { useState, useEffect, useRef } from 'react';
import Slider from 'react-slick';
import Navbar from './components/Navbar';
import CategoryCard from './components/CategoryCard';
import ProductCard from './components/ProductCard';
import Footer from './components/Footer';

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

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const categorySliderRef = useRef<any>(null);

  useEffect(() => {
    fetchPublicData();
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

      // Fetch products
      const productRes = await fetch('http://localhost:5000/api/public/products?limit=12');
      const productData = await productRes.json();
      if (productData.status === 'success') {
        setProducts(productData.data.products);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Banner carousel settings - Auto slides every 5 seconds
  const bannerSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    arrows: false,
    pauseOnHover: true,
    dotsClass: "slick-dots custom-dots",
  };

  // Category slider settings with navigation arrows
  const categorySettings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 5,
    slidesToScroll: 2,
    arrows: false,
    swipeToSlide: true,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: 4,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const nextCategory = () => categorySliderRef.current?.slickNext();
  const prevCategory = () => categorySliderRef.current?.slickPrev();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading StudentStore...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* 1. Great Navbar */}
      <Navbar />

      {/* 2. Hero Banner Slider - Auto sliding every 5 seconds */}
      <section className="relative max-w-7xl mx-auto mt-8 px-4">
        <div className="rounded-2xl overflow-hidden shadow-2xl">
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
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Banner content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
                      <h2 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-2 drop-shadow-lg">
                        {banner.name}
                      </h2>
                      <div className="inline-flex items-center text-white/90 text-sm font-medium">
                        Shop Now
                        <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                    </div>
                  </a>
                </div>
              ))}
            </Slider>
          ) : (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-64 md:h-80 lg:h-96 flex items-center justify-center rounded-2xl">
              <div className="text-center text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome to StudentStore</h2>
                <p className="text-xl opacity-90">Discover amazing products for your student life</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Modern Category Cards with Swipe Navigation */}
      <section className="max-w-7xl mx-auto mt-16 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Shop by Category</h3>
            <p className="text-gray-600 text-lg">Find exactly what you need for your studies</p>
          </div>
          
          {/* Navigation arrows */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={prevCategory}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 hover:scale-105"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextCategory}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 hover:scale-105"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {categories.length > 0 ? (
          <Slider ref={categorySliderRef} {...categorySettings}>
            {categories.map((category) => (
              <div key={category.id} className="px-2">
                <CategoryCard category={category} />
              </div>
            ))}
          </Slider>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: '📚', name: 'Textbooks', desc: 'New & used books' },
              { icon: '💻', name: 'Electronics', desc: 'Laptops & gadgets' },
              { icon: '✏️', name: 'Stationery', desc: 'Pens & notebooks' },
              { icon: '🎒', name: 'Campus Gear', desc: 'Backpacks & more' },
              { icon: '📖', name: 'Courses', desc: 'Online learning' },
            ].map((category, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 text-center group cursor-pointer">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">{category.icon}</div>
                <h4 className="font-semibold text-gray-900 mb-1">{category.name}</h4>
                <p className="text-sm text-gray-500">{category.desc}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Featured Products Grid */}
      <section className="max-w-7xl mx-auto mt-16 px-4">
        <div className="text-center mb-12">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Featured Products</h3>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
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
            <h4 className="text-xl font-semibold text-gray-900 mb-2">No products available</h4>
            <p className="text-gray-600">Check back soon for amazing student deals!</p>
          </div>
        )}
      </section>

      {/* 5. Beautiful Footer */}
      <Footer />
    </div>
  );
}
