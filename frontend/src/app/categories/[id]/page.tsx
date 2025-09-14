'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '../../components/Navbar';
import ProductCard from '../../components/ProductCard';
import Footer from '../../components/Footer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  buy_button_2_name?: string;
  buy_button_2_url?: string;
  buy_button_3_name?: string;
  buy_button_3_url?: string;
  views_count: number;
  rating_average: number;
  review_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  description: string;
}

interface CategoryPageData {
  category: Category;
  products: Product[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export default function CategoryPage() {
  const params = useParams();
  const categoryId = params.id as string;
  
  const [data, setData] = useState<CategoryPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryProducts();
    }
  }, [categoryId, currentPage]);

  const fetchCategoryProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:5000/api/public/categories/${categoryId}/products?page=${currentPage}&limit=12`
      );
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load category products');
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setError('Failed to load category products');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading products...</p>
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
              onClick={fetchCategoryProducts}
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

  if (!data || !data.category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">📂</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Category not found</h1>
            <p className="text-gray-600 mb-6">The category you're looking for doesn't exist.</p>
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
          <span className="text-indigo-600 font-medium">{data.category.name}</span>
        </nav>
      </div>

      {/* Category Header */}
      <section className="max-w-7xl mx-auto px-4 mb-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {data.category.name}
          </h1>
          {data.category.description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              {data.category.description}
            </p>
          )}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-1 w-24 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Products Section */}
      <section className="max-w-7xl mx-auto px-4 mb-16">
        {/* Results Info */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-gray-600">
              Showing <span className="font-semibold">{data.products.length}</span> of{' '}
              <span className="font-semibold">{data.pagination.total}</span> products
            </p>
          </div>
        </div>

        {/* Products Grid */}
        {data.products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">
            {data.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No products found</h3>
            <p className="text-gray-600 mb-6">
              We couldn't find any products in this category yet. Check back soon!
            </p>
            <a
              href="/"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Browse Other Categories
            </a>
          </div>
        )}

        {/* Pagination */}
        {data.pagination.total_pages > 1 && (
          <div className="flex justify-center items-center space-x-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!data.pagination.has_prev}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <div className="flex space-x-2">
              {Array.from({ length: data.pagination.total_pages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    page === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!data.pagination.has_next}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
