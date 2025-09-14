'use client';

import { useState, useEffect } from 'react';

interface Banner {
  id: number;
  name: string;
  media_url: string;
  link_url: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  admin_name: string;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch('http://localhost:5000/api/admin/banners', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        setBanners(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load banners');
      }
    } catch (error) {
      console.error('Banners fetch error:', error);
      setError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId: number, bannerName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${bannerName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('studentstore_token');
      const response = await fetch(`http://localhost:5000/api/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Banner permanently deleted!');
        fetchBanners();
      } else {
        alert(`Failed to delete banner: ${result.message}`);
      }
    } catch (error) {
      console.error('Delete banner error:', error);
      alert('Failed to delete banner');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banner Management</h1>
          <p className="text-gray-600">Create and manage homepage banners for hot deals</p>
        </div>
        <a 
          href="/admin/banners/create"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Create Banner
        </a>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">Error: {error}</p>
          <button 
            onClick={fetchBanners}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Banners List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {banners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Banner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Display Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {banners.map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-20 w-32">
                          {banner.media_url.includes('.mp4') || banner.media_url.includes('.webm') ? (
                            <video 
                              className="h-20 w-32 rounded-lg object-cover" 
                              src={banner.media_url}
                              muted
                              loop
                              onMouseEnter={(e) => e.currentTarget.play()}
                              onMouseLeave={(e) => e.currentTarget.pause()}
                            />
                          ) : (
                            <img 
                              className="h-20 w-32 rounded-lg object-cover" 
                              src={banner.media_url}
                              alt={banner.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjgwIiB2aWV3Qm94PSIwIDAgMTI4IDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik02NCA1NkM1My4zNzI2IDU2IDQ0LjUgNDcuMTI3NCA0NC41IDM2QzQ0LjUgMjQuODcyNiA1My4zNzI2IDE2IDY0IDE2Qzc0LjYyNzQgMTYgODMuNSAyNC44NzI2IDgzLjUgMzZDODMuNSA0Ny4xMjc0IDc0LjYyNzQgNTYgNjQgNTZaIiBmaWxsPSIjRTVFN0VCIi8+Cjwvc3ZnPgo=';
                              }}
                            />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {banner.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Created by {banner.admin_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Order: {banner.display_order}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                      <a 
                        href={banner.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {banner.link_url}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(banner.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <a 
                        href={`/admin/banners/${banner.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </a>
                      <button 
                        onClick={() => handleDeleteBanner(banner.id, banner.name)}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No banners found</div>
            <a 
              href="/admin/banners/create"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create Your First Banner
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
