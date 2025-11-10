'use client';

import { useState, useEffect } from 'react';

interface Recommendation {
  id: number;
  user_name: string;
  user_email: string;
  product_name: string;
  review_text: string | null;
  product_link: string;
  product_images: string;
  price: number | null;
  created_at: string;
  add_to_posts: boolean | null;          // User's choice (read-only badge)
  added_to_products: boolean;            // ✅ NEW: Admin added to products
  added_to_posts: boolean;               // ✅ NEW: Admin added to posts
  products_added_at?: string | null;
  posts_added_at?: string | null;
}

export default function AdminRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<{ id: number; field: 'products' | 'posts' } | null>(null); // ✅ Track which checkbox is updating
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const fetchRecommendations = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('studentstore_token');
    const res = await fetch(`${apiUrl}/api/admin/feedback/recommendations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.status === 'success') {
      // ✅ Normalize data to ensure boolean values (default to false)
      const normalizedData = data.data.recommendations.map((rec: any) => ({
        ...rec,
        added_to_products: rec.added_to_products ?? false,  // Default to false if null/undefined
        added_to_posts: rec.added_to_posts ?? false,        // Default to false if null/undefined
      }));
      
      setRecommendations(normalizedData);
      setFilteredRecommendations(normalizedData);
    } else {
      alert('Failed to fetch recommendations');
    }
  } catch (e) {
    console.error(e);
    alert('Error fetching recommendations');
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecommendations(recommendations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = recommendations.filter(rec => 
        rec.product_name.toLowerCase().includes(query) ||
        rec.user_name.toLowerCase().includes(query) ||
        rec.user_email.toLowerCase().includes(query)
      );
      setFilteredRecommendations(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, recommendations]);

  const totalPages = Math.ceil(filteredRecommendations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRecommendations = filteredRecommendations.slice(startIndex, endIndex);

  // ✅ NEW: Toggle admin checkboxes
  const toggleAdminMark = async (
    id: number, 
    field: 'products' | 'posts', 
    currentValue: boolean
  ) => {
    setUpdatingId({ id, field });
    
    try {
      const token = localStorage.getItem('studentstore_token');
      const newValue = !currentValue;
      
      const body = field === 'products' 
        ? { added_to_products: newValue }
        : { added_to_posts: newValue };
      
      const res = await fetch(`${apiUrl}/api/admin/feedback/recommendations/${id}/mark-added`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.status === 'success') {
        // Update local state
        setRecommendations(prev => 
          prev.map(rec => 
            rec.id === id ? { ...rec, ...data.data } : rec
          )
        );
      } else {
        alert(data.message || 'Failed to update recommendation');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating recommendation');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRecommendation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recommendation?')) return;

    try {
      const token = localStorage.getItem('studentstore_token');
      const res = await fetch(`${apiUrl}/api/admin/feedback/recommendations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status === 'success') {
        alert('Recommendation deleted');
        fetchRecommendations();
      } else {
        alert('Failed to delete recommendation');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting recommendation');
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const renderPostsBadge = (addToPosts: boolean | null) => {
    if (addToPosts === true) {
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
          ✅ User: Add to Posts
        </span>
      );
    } else if (addToPosts === false) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
          ❌ User: Don't Add
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
          ⏳ User: Not Asked
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Product Recommendations</h1>
        <p className="text-gray-600">Manage product recommendations from students</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, user name, or email..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {filteredRecommendations.length} of {recommendations.length} recommendations
          </div>
        </div>
      </div>

      {/* Recommendations List */}
      {paginatedRecommendations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="text-4xl mb-2">
            {searchQuery ? '🔍' : '📝'}
          </div>
          <p className="text-gray-600">
            {searchQuery 
              ? `No recommendations found matching "${searchQuery}"` 
              : 'No recommendations available.'}
          </p>
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {paginatedRecommendations.map((rec) => {
              let images: string[] = [];
              try {
                images = JSON.parse(rec.product_images) || [];
              } catch {
                images = [];
              }

              const isUpdatingProducts = updatingId?.id === rec.id && updatingId?.field === 'products';
              const isUpdatingPosts = updatingId?.id === rec.id && updatingId?.field === 'posts';

              return (
                <li key={rec.id} className="border rounded-lg p-4 shadow-sm flex flex-col sm:flex-row gap-4 bg-white hover:shadow-md transition">
                  {/* ✅ NEW: TWO Checkboxes - Products & Posts */}
                  <div className="flex-shrink-0 flex flex-col gap-3 pt-2">
                    {/* Products Checkbox */}
<label className="flex items-center cursor-pointer group" title="Mark as added to Products page">
  <input
    type="checkbox"
    checked={rec.added_to_products ?? false}  // ✅ Fallback to false
    onChange={() => toggleAdminMark(rec.id, 'products', rec.added_to_products ?? false)}
    disabled={isUpdatingProducts}
    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  />
  <span className="ml-2 text-xs font-medium text-gray-700">Products</span>
  {isUpdatingProducts && (
    <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
  )}
</label>

{/* Posts Checkbox */}
<label className="flex items-center cursor-pointer group" title="Mark as added to Posts page">
  <input
    type="checkbox"
    checked={rec.added_to_posts ?? false}  // ✅ Fallback to false
    onChange={() => toggleAdminMark(rec.id, 'posts', rec.added_to_posts ?? false)}
    disabled={isUpdatingPosts}
    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
  />
  <span className="ml-2 text-xs font-medium text-gray-700">Posts</span>
  {isUpdatingPosts && (
    <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
  )}
</label>

                  </div>

                  {/* Images */}
                  <div className="flex gap-2 flex-shrink-0 overflow-x-auto max-w-xs">
                    {images.length > 0 ? (
                      images.map((url, i) => (
                        <a 
                          key={i} 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title="Open image in new tab"
                          className="block w-20 h-20 rounded overflow-hidden border border-gray-300 hover:brightness-90 transition"
                        >
                          <img
                            src={url}
                            alt={rec.product_name}
                            className="w-full h-full object-cover"
                            onError={(e) => (e.currentTarget.src = '/placeholder-product.jpg')}
                          />
                        </a>
                      ))
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 flex items-center justify-center rounded text-gray-500 text-xs">
                        No Images
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h2 className="font-semibold text-lg text-gray-900">{rec.product_name}</h2>
                      {renderPostsBadge(rec.add_to_posts)}
                    </div>
                    
                    <p className="text-sm text-gray-700 line-clamp-3 mb-2">{rec.review_text}</p>
                    
                    <a
                      href={rec.product_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all text-sm inline-block mb-2"
                    >
                      🔗 {rec.product_link}
                    </a>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <p className="font-bold text-gray-900">
                        Price: ₹{rec.price ?? 'N/A'}
                      </p>
                      <span className="text-gray-300">|</span>
                      <p className="text-xs text-gray-500">
                        By <span className="font-medium text-gray-700">{rec.user_name}</span> ({rec.user_email})
                      </p>
                      <span className="text-gray-300">|</span>
                      <p className="text-xs text-gray-500">
                        {new Date(rec.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex flex-col justify-center items-center gap-2">
                    <button
                      onClick={() => deleteRecommendation(rec.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm shadow-sm hover:shadow-md"
                      title="Delete Recommendation"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Pagination Controls */}
          {filteredRecommendations.length > 0 && (
            <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredRecommendations.length)} of {filteredRecommendations.length} recommendations
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    const showEllipsis = 
                      (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2);

                    if (showEllipsis) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
