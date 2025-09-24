'use client';

import { useState, useEffect, useCallback } from 'react';

interface Product {
  id: number;
  name: string;
  description: string;
  image_urls: string;
  views_count: number;
  rating_average: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
  category_name: string;
  admin_name: string;
  buy_button_1_name: string;
  buy_button_1_url: string;
  buy_button_2_name?: string;
  buy_button_2_url?: string;
  buy_button_3_name?: string;
  buy_button_3_url?: string;
}

interface ProductsData {
  products: Product[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export default function AdminProducts() {
  const [data, setData] = useState<ProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  // Enhanced loading states
  const [loadingStates, setLoadingStates] = useState({
    initial: true,
    searching: false,
    pagination: false,
    deleting: null as number | null
  });

  // Fetch products immediately on mount and when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm]);

  // Real-time event listeners for admin updates
  useEffect(() => {
    const handleAdminUpdate = (event: CustomEvent) => {
      const { type } = event.detail;
      
      if (type === 'product') {
        console.log('🔄 Product update detected, refreshing admin products list');
        fetchProducts();
      }
    };

    const handleReviewUpdate = (event: CustomEvent) => {
      const { productId } = event.detail;
      
      if (productId && data?.products) {
        console.log(`🔄 Review update detected for product ${productId}, refreshing data`);
        fetchProducts();
      }
    };

    window.addEventListener('adminUpdate' as any, handleAdminUpdate);
    window.addEventListener('reviewUpdate' as any, handleReviewUpdate);
    
    return () => {
      window.removeEventListener('adminUpdate' as any, handleAdminUpdate);
      window.removeEventListener('reviewUpdate' as any, handleReviewUpdate);
    };
  }, [data?.products]);

  // Enhanced fetch function
  const fetchProducts = async () => {
    try {
      const isInitialLoad = loading && loadingStates.initial;
      const isPaginating = !isInitialLoad && currentPage > 1;
      
      if (isPaginating) {
        setLoadingStates(prev => ({ ...prev, pagination: true }));
      }

      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      let url = `${apiUrl}/api/admin/products?page=${currentPage}&limit=10`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load products');
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setError(`Failed to load products: ${error}`);
    } finally {
      setLoading(false);
      setLoadingStates(prev => ({ 
        ...prev, 
        initial: false, 
        searching: false, 
        pagination: false 
      }));
    }
  };

  // Search functionality
  const handleSearchSubmit = (searchValue: string) => {
    const trimmedValue = searchValue.trim();
    setSearchTerm(trimmedValue);
    setCurrentPage(1);
    
    if (trimmedValue) {
      setLoadingStates(prev => ({ ...prev, searching: true }));
    }
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      handleSearchSubmit(value);
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (!value.trim()) {
      handleSearchSubmit('');
      return;
    }
    
    setLoadingStates(prev => ({ ...prev, searching: true }));
    debouncedSearch(value);
  };

  const handleSearchButtonClick = () => {
    handleSearchSubmit(searchInput);
  };

  const clearSearch = () => {
    setSearchInput('');
    handleSearchSubmit('');
  };

  // Pagination handlers
  const handlePreviousPage = () => {
    if (currentPage > 1 && !loadingStates.pagination) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (data && currentPage < data.pagination.total_pages && !loadingStates.pagination) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    const originalData = data;
    
    try {
      setLoadingStates(prev => ({ ...prev, deleting: productId }));
      
      // Optimistic UI update
      if (data) {
        const updatedProducts = data.products.filter(p => p.id !== productId);
        setData({
          ...data,
          products: updatedProducts,
          pagination: {
            ...data.pagination,
            total: data.pagination.total - 1
          }
        });
      }

      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Dispatch events for real-time updates
        window.dispatchEvent(new CustomEvent('adminUpdate', {
          detail: { type: 'product', action: 'delete', productId, timestamp: Date.now() }
        }));
        
        // Show success feedback
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              type: 'success',
              message: `🗑️ Product "${productName}" deleted successfully!`,
              duration: 4000
            }
          }));
        }

        setTimeout(() => {
          fetchProducts();
        }, 500);
      } else {
        setData(originalData);
        alert(`Failed to delete product: ${result.message}`);
      }
    } catch (error) {
      setData(originalData);
      console.error('Delete product error:', error);
      alert('Failed to delete product');
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: null }));
    }
  };

  // Helper functions
  const getSafeRating = (rating: number | null): number => {
    return rating ?? 0;
  };

  const getSafeRatingDisplay = (rating: number | null): string => {
    return rating ? rating.toFixed(1) : '0.0';
  };

  const getProductImage = (imageUrls: string) => {
    try {
      const urls = JSON.parse(imageUrls);
      return urls[0] || '/placeholder-product.jpg';
    } catch {
      return '/placeholder-product.jpg';
    }
  };

  if (loading && loadingStates.initial) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="animate-pulse bg-gray-200 h-8 rounded w-64 mb-2"></div>
            <div className="animate-pulse bg-gray-200 h-4 rounded w-80"></div>
          </div>
          <div className="flex space-x-4">
            <div className="animate-pulse bg-gray-200 h-10 rounded w-32"></div>
            <div className="animate-pulse bg-gray-200 h-10 rounded w-32"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
          <div className="h-64 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-red-800 font-semibold">Error: {error}</p>
            <button 
              onClick={fetchProducts}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📦 Product Management</h1>
          <p className="text-gray-600">Manage your affiliate products with real-time search</p>
          {data && (
            <p className="text-sm text-gray-500 mt-1">
              📊 Total: {data.pagination.total} products
              {searchTerm && (
                <span className="ml-2 text-blue-600 font-medium">
                  | 🔍 Searching: "{searchTerm}" ({data.products.length} found)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex space-x-4">
          <a 
            href="/admin/categories"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            📂 Manage Categories
          </a>
          <a 
            href="/admin/products/create"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            🚀 Create Product
          </a>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex max-w-2xl space-x-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="🔍 Search products by name, description, or category..."
              value={searchInput}
              onChange={handleSearchChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchButtonClick();
                }
              }}
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-2">
              {loadingStates.searching && (
                <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
              )}
              {searchInput && (
                <button
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={handleSearchButtonClick}
            disabled={loadingStates.searching}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 flex items-center shadow-lg hover:shadow-xl"
          >
            {loadingStates.searching ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Search
          </button>
        </div>
        
        {searchTerm && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              🔍 <strong>{data?.pagination.total || 0} product(s)</strong> found for "{searchTerm}"
              {data && data.pagination.total > 0 && (
                <span className="ml-2">
                  (Showing page {currentPage} of {data.pagination.total_pages})
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border">
        {data && data.products.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      📦 Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      📂 Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      👀 Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ⭐ Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      📅 Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ⚡ Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.products.map((product) => (
                    <tr key={product.id} className={`hover:bg-gray-50 transition-colors duration-150 ${searchTerm && (product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.description.toLowerCase().includes(searchTerm.toLowerCase())) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            <img 
                              className="h-12 w-12 rounded-lg object-cover shadow-sm" 
                              src={getProductImage(product.image_urls)}
                              alt={product.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAzMkMxNy4zNzI2IDMyIDEyIDI2LjYyNzQgMTIgMjBDMTIgMTMuMzcyNiAxNy4zNzI2IDggMjQgOEMzMC42Mjc0IDggMzYgMTMuMzcyNiAzNiAyMEMzNiAyNi42Mjc0IDMwLjYyNzQgMzIgMjQgMzJaIiBmaWxsPSIjRTVFN0VCIi8+Cjwvc3ZnPgo=';
                              }}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 max-w-xs">
                              {searchTerm ? (
                                <span dangerouslySetInnerHTML={{
                                  __html: product.name.replace(
                                    new RegExp(`(${searchTerm})`, 'gi'),
                                    '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                  )
                                }} />
                              ) : (
                                product.name
                              )}
                            </div>
                            <div className="text-sm text-gray-500 max-w-xs truncate">
                              {searchTerm ? (
                                <span dangerouslySetInnerHTML={{
                                  __html: product.description.replace(
                                    new RegExp(`(${searchTerm})`, 'gi'),
                                    '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                  )
                                }} />
                              ) : (
                                product.description
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {product.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                        👁️ {product.views_count.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className={`text-lg ${getSafeRating(product.rating_average) > 0 ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                          <span className="ml-1 font-medium">{getSafeRatingDisplay(product.rating_average)}</span>
                          <span className="ml-1 text-gray-400">({product.review_count})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(product.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <a 
                          href={`/admin/products/${product.id}`}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors duration-200 inline-flex items-center"
                        >
                          ✏️ Edit
                        </a>
                        <button 
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          disabled={loadingStates.deleting === product.id}
                          className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50 transition-colors duration-200"
                        >
                          {loadingStates.deleting === product.id ? (
                            <span className="flex items-center">
                              <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1"></div>
                              Deleting...
                            </span>
                          ) : (
                            '🗑️ Delete'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1 || loadingStates.pagination}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === data.pagination.total_pages || loadingStates.pagination}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      📄 Showing page <span className="font-medium">{currentPage}</span> of{' '}
                      <span className="font-medium">{data.pagination.total_pages}</span>
                      {searchTerm ? (
                        <span> ({data.pagination.total} search results)</span>
                      ) : (
                        <span> ({data.pagination.total} total products)</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1 || loadingStates.pagination}
                        className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        {currentPage} of {data.pagination.total_pages}
                      </span>
                      
                      <button
                        onClick={handleNextPage}
                        disabled={currentPage === data.pagination.total_pages || loadingStates.pagination}
                        className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Next
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">
              {searchTerm ? '🔍' : '📦'}
            </div>
            <div className="text-gray-500 text-lg mb-4">
              {searchTerm ? `No products found for "${searchTerm}"` : 'No products found'}
            </div>
            {searchTerm ? (
              <button
                onClick={clearSearch}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                🔄 Clear Search & Show All
              </button>
            ) : (
              <a 
                href="/admin/products/create"
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 inline-flex items-center shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                🚀 Create Your First Product
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}
