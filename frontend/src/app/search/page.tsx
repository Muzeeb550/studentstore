'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  category_name: string;
  category_id: number;
  buy_button_1_name: string;
  buy_button_1_url: string;
  views_count: number;
  rating_average: number;
  review_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  product_count: number;
}

interface SearchResultsData {
  query: string;
  results: Product[];
  total: number;
  categories: Category[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters: {
    category: number | null;
    sort: string;
  };
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category');
  const sortFilter = searchParams.get('sort') || 'relevance';
  const pageFilter = searchParams.get('page') || '1';
  
  const [data, setData] = useState<SearchResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.trim()) {
      fetchSearchResults();
    } else {
      setLoading(false);
      setError('Please enter a search query');
    }
  }, [query, categoryFilter, sortFilter, pageFilter]);

  const fetchSearchResults = async () => {
    try {
      setLoading(true);
      
      // Build search URL with filters
      const searchUrl = new URL('http://localhost:5000/api/public/search');
      searchUrl.searchParams.set('q', query);
      if (categoryFilter) searchUrl.searchParams.set('category', categoryFilter);
      if (sortFilter) searchUrl.searchParams.set('sort', sortFilter);
      if (pageFilter) searchUrl.searchParams.set('page', pageFilter);
      searchUrl.searchParams.set('limit', '12');

      const response = await fetch(searchUrl.toString());
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const updateFilters = (newCategory?: string, newSort?: string, newPage?: string) => {
    const url = new URL(window.location.href);
    if (newCategory !== undefined) {
      if (newCategory) {
        url.searchParams.set('category', newCategory);
      } else {
        url.searchParams.delete('category');
      }
    }
    if (newSort) url.searchParams.set('sort', newSort);
    if (newPage) {
      url.searchParams.set('page', newPage);
    } else {
      url.searchParams.delete('page');
    }
    
    window.history.pushState({}, '', url.toString());
    window.location.reload();
  };

  const handlePageChange = (page: number) => {
    updateFilters(undefined, undefined, page.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Searching for "{query}"...</p>
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
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
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

  if (!data || !query.trim()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Start Your Search</h1>
            <p className="text-gray-600 mb-6">Enter a search term to find products for students</p>
            <a
              href="/"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Browse Categories
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

      {/* Search Header */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Search Results
            </h1>
            <p className="text-gray-600">
              {data.total > 0 ? (
                <>
                  Found <span className="font-semibold text-indigo-600">{data.total}</span> product{data.total !== 1 ? 's' : ''} for "
                  <span className="font-semibold">{query}</span>"
                </>
              ) : (
                <>No products found for "<span className="font-semibold">{query}</span>"</>
              )}
            </p>
          </div>
        </div>

        {/* Filters and Sort */}
        {data.total > 0 && (
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            {/* Category Filter */}
            <div className="lg:w-1/4">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Filter by Category</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => updateFilters('')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 ${
                      !data.filters.category 
                        ? 'bg-indigo-100 text-indigo-700 font-medium' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All Categories ({data.total})
                  </button>
                  {data.categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => updateFilters(category.id.toString())}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 flex justify-between items-center ${
                        data.filters.category === category.id
                          ? 'bg-indigo-100 text-indigo-700 font-medium' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className="text-sm text-gray-500">({category.product_count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results and Sort */}
            <div className="lg:w-3/4">
              {/* Sort Options */}
              <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600">
                  Showing <span className="font-semibold">{data.results.length}</span> of{' '}
                  <span className="font-semibold">{data.total}</span> results
                </p>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Sort by:</label>
                  <select
                    value={data.filters.sort}
                    onChange={(e) => updateFilters(undefined, e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name A-Z</option>
                    <option value="name_desc">Name Z-A</option>
                    <option value="rating">Highest Rated</option>
                    <option value="views">Most Viewed</option>
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.total_pages > 1 && (
                <div className="flex justify-center items-center space-x-4">
                  <button
                    onClick={() => handlePageChange(data.pagination.current_page - 1)}
                    disabled={!data.pagination.has_prev}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  <div className="flex space-x-2">
                    {Array.from({ length: Math.min(data.pagination.total_pages, 7) }, (_, i) => {
                      let pageNum;
                      if (data.pagination.total_pages <= 7) {
                        pageNum = i + 1;
                      } else {
                        const current = data.pagination.current_page;
                        const total = data.pagination.total_pages;
                        if (current <= 4) {
                          pageNum = i + 1;
                        } else if (current >= total - 3) {
                          pageNum = total - 6 + i;
                        } else {
                          pageNum = current - 3 + i;
                        }
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            pageNum === data.pagination.current_page
                              ? 'bg-indigo-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(data.pagination.current_page + 1)}
                    disabled={!data.pagination.has_next}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Results */}
        {data.total === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">No products found</h3>
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-gray-600">
                We couldn't find any products matching "<strong>{query}</strong>". 
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Try these suggestions:</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Check your spelling</li>
                  <li>Use different or more general keywords</li>
                  <li>Try searching for a category instead</li>
                  <li>Browse our popular categories below</li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-6">
                <a href="/categories/1" className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors">
                  📚 Textbooks
                </a>
                <a href="/" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  Browse All Categories
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
