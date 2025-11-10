'use client';

import { useState, useEffect } from 'react';

interface Recommendation {
  id: number;
  user_name: string;
  user_email: string;
  product_name: string;
  review_text: string | null;
  product_link: string;
  product_images: string; // JSON stringified array
  price: number | null;
  created_at: string;
  add_to_posts: boolean | null; // ✅ NEW: Add to posts choice
}

interface Pagination {
  current_page: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

export default function AdminRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ current_page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchRecommendations = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('studentstore_token');
      const res = await fetch(`${apiUrl}/api/admin/feedback/recommendations?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.status === 'success') {
        setRecommendations(data.data.recommendations);
        setPagination(data.data.pagination);
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
        fetchRecommendations(pagination.current_page);
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

  // ✅ NEW: Helper function to render add_to_posts badge
  const renderPostsBadge = (addToPosts: boolean | null) => {
    if (addToPosts === true) {
      return (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
          ✅ Add to Posts
        </span>
      );
    } else if (addToPosts === false) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
          ❌ Don't Add
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
          ⏳ Not Asked
        </span>
      );
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Product Recommendations</h1>

      {loading ? (
        <p>Loading recommendations...</p>
      ) : (
        <>
          {recommendations.length === 0 ? (
            <p>No recommendations available.</p>
          ) : (
            <ul className="space-y-4">
              {recommendations.map((rec) => {
                let images: string[] = [];
                try {
                  images = JSON.parse(rec.product_images) || [];
                } catch {
                  images = [];
                }

                return (
                  <li key={rec.id} className="border rounded p-4 shadow-sm flex flex-col sm:flex-row gap-4 bg-white hover:shadow-md transition">
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
                        {/* ✅ NEW: Add to Posts Badge */}
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
          )}

          {/* Pagination Controls */}
          <div className="mt-6 flex gap-3 justify-center items-center">
            <button
              disabled={pagination.current_page === 1}
              onClick={() => fetchRecommendations(pagination.current_page - 1)}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-semibold">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              disabled={pagination.current_page === pagination.total_pages}
              onClick={() => fetchRecommendations(pagination.current_page + 1)}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
