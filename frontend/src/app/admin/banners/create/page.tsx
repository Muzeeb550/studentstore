'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BannerFormData {
  name: string;
  media_url: string;
  link_url: string;
  display_order: number;
}

export default function CreateBanner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<BannerFormData>({
    name: '',
    media_url: '',
    link_url: '',
    display_order: 1
  });

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (images and videos)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image (JPG, PNG, GIF, WebP) or video (MP4, WebM) file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      alert('File size should be less than 50MB');
      return;
    }

    setUploading(true);
    
    try {
      const token = localStorage.getItem('studentstore_token');
      
      // Get ImageKit authentication
      const authResponse = await fetch('http://localhost:5000/api/admin/imagekit-auth', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const authResult = await authResponse.json();
      
      // Upload to ImageKit
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('fileName', `banner_${Date.now()}_${file.name}`);
      uploadData.append('folder', '/studentstore/banners');
      uploadData.append('token', authResult.token);
      uploadData.append('signature', authResult.signature);
      uploadData.append('expire', authResult.expire.toString());
      uploadData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: uploadData
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok) {
        setFormData(prev => ({
          ...prev,
          media_url: uploadResult.url
        }));
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.media_url || !formData.link_url) {
      setError('Please fill in all required fields and upload media');
      return;
    }

    // Validate URL format
    try {
      new URL(formData.link_url);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      
      const response = await fetch('http://localhost:5000/api/admin/banners', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Banner created successfully!');
        router.push('/admin/banners');
      } else {
        setError(result.message || 'Failed to create banner');
      }
    } catch (error) {
      console.error('Create banner error:', error);
      setError('Failed to create banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Banner</h1>
          <p className="text-gray-600">Add a promotional banner for your homepage</p>
        </div>
        <a 
          href="/admin/banners"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Banners
        </a>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Create Banner Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Banner Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., Back to School Sale, Hot Deal Alert"
              required
            />
          </div>

          {/* Banner Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image/Video <span className="text-red-500">*</span>
            </label>
            
            {formData.media_url && (
              <div className="mb-4">
                {formData.media_url.includes('.mp4') || formData.media_url.includes('.webm') ? (
                  <video 
                    src={formData.media_url} 
                    className="w-full h-48 object-cover rounded-lg border"
                    controls
                    muted
                  />
                ) : (
                  <img 
                    src={formData.media_url} 
                    alt="Banner preview"
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                )}
              </div>
            )}
            
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={handleMediaUpload}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            
            {uploading && (
              <div className="mt-2 text-sm text-green-600">
                Uploading media...
              </div>
            )}
            
            <p className="mt-1 text-sm text-gray-500">
              Supported formats: JPG, PNG, GIF, WebP, MP4, WebM (Max: 50MB)
            </p>
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://example.com/sale"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Where should users go when they click this banner?
            </p>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.display_order}
              onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              Lower numbers appear first (1 = first, 2 = second, etc.)
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <a
              href="/admin/banners"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Banner...' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
