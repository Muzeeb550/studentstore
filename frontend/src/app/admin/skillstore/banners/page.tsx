'use client';

import { useState, useEffect } from 'react';

interface Banner {
  id: number;
  image_url: string;
  display_order: number;
  redirect_type: string;
  redirect_skill_id: number | null;
  redirect_custom_url: string | null;
  created_at: string;
  updated_at: string;
  admin_name: string;
  skill_name: string | null;
}

export default function BannersListPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/banners`, {
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
      console.error('Fetch banners error:', error);
      setError('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) {
      return;
    }

    setDeleteLoading(id);
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/banners/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Banner deleted successfully');
        fetchBanners();
      } else {
        alert(result.message || 'Failed to delete banner');
      }
    } catch (error) {
      console.error('Delete banner error:', error);
      alert('Failed to delete banner');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SkillStore Banners</h1>
          <p className="text-gray-600">Manage homepage carousel banners</p>
        </div>
        <div className="flex space-x-3">
          <a 
            href="/admin/skillstore"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ← Back
          </a>
          <a 
            href="/admin/skillstore/banners/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create Banner
          </a>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Banners Grid */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-4">No banners created yet</p>
          <a 
            href="/admin/skillstore/banners/create"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create First Banner
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Banner Image */}
              <div className="aspect-video bg-gray-100 relative">
                <img 
                  src={banner.image_url} 
                  alt={`Banner ${banner.id}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23f3f4f6" width="400" height="225"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                  }}
                />
                <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                  Order: {banner.display_order}
                </div>
              </div>

              {/* Banner Info */}
              <div className="p-4">
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium capitalize">{banner.redirect_type}</span>
                  </div>
                  {banner.redirect_type === 'skill' && banner.skill_name && (
                    <div className="text-sm">
                      <span className="text-gray-600">Links to:</span>
                      <span className="ml-2 font-medium">{banner.skill_name}</span>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-gray-600">Added by:</span>
                    <span className="ml-2 font-medium">{banner.admin_name}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(banner.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <a
                    href={`/admin/skillstore/banners/edit/${banner.id}`}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium text-center transition-colors"
                  >
                    Edit
                  </a>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    disabled={deleteLoading === banner.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {deleteLoading === banner.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
