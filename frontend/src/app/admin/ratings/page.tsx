'use client';

import { useState, useEffect } from 'react';

interface Rating {
  id: number;
  user_name: string;
  user_email: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  is_updated: boolean;
  updated_at?: string; // Added updated_at to show updated timestamp
}

interface Pagination {
  current_page: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

// Converts any Date string to IST formatted string
function toIST(dateString: string) {
  const date = new Date(dateString);
  const istOffset = 5.5 * 60; // IST is UTC +5:30 in minutes
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + istOffset * 60000);
  return istTime.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'updated'>('newest');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const fetchRatings = async (page: number = 1, sortBy: typeof sort = sort) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('studentstore_token'); // Admin JWT token
      const res = await fetch(`${apiUrl}/api/admin/feedback/ratings?page=${page}&sort=${sortBy}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.status === 'success') {
        // Ensure ratings have updated_at fields, or fallback to created_at
        const enrichedRatings = data.data.ratings.map((r: Rating) => ({
          ...r,
          updated_at: r.updated_at || r.created_at,
        }));
        setRatings(enrichedRatings);
        setPagination(data.data.pagination);
      } else {
        alert('Failed to fetch ratings.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Error fetching ratings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [sort]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchRatings(newPage);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Ratings</h1>

      <div className="mb-4">
        <label htmlFor="sort" className="mr-2 font-medium">
          Sort by:
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="border px-2 py-1 rounded"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="rating_high">Highest Rating</option>
          <option value="rating_low">Lowest Rating</option>
          <option value="updated">Most Recently Updated</option>
        </select>
      </div>

      {loading ? (
        <p>Loading ratings...</p>
      ) : (
        <>
          <table className="w-full border-collapse border border-gray-300 text-left text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2">User</th>
                <th className="border border-gray-300 px-3 py-2">Email</th>
                <th className="border border-gray-300 px-3 py-2">Rating</th>
                <th className="border border-gray-300 px-3 py-2">Review</th>
                <th className="border border-gray-300 px-3 py-2">Created At</th>
                <th className="border border-gray-300 px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((r) => (
                <tr key={r.id} className="border-t border-gray-300">
                  <td className="border border-gray-300 px-3 py-2">{r.user_name}</td>
                  <td className="border border-gray-300 px-3 py-2">{r.user_email}</td>
                  <td className="border border-gray-300 px-3 py-2 text-yellow-500 font-semibold">{r.rating} ⭐</td>
                  <td className="border border-gray-300 px-3 py-2 max-w-xs truncate">{r.review_text || '-'}</td>
                  <td className="border border-gray-300 px-3 py-2">{toIST(r.created_at)}</td>
                  <td className="border border-gray-300 px-3 py-2">
                    {r.is_updated ? (
                      <>
                        🔄 Yes <br />
                        <span className="text-xs text-gray-600">
                          ({toIST(r.updated_at!)})
                        </span>
                      </>
                    ) : (
                      'No'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="mt-4 flex justify-center gap-4">
            <button
              disabled={pagination.current_page === 1}
              onClick={() => handlePageChange(pagination.current_page - 1)}
              className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              disabled={pagination.current_page === pagination.total_pages}
              onClick={() => handlePageChange(pagination.current_page + 1)}
              className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
