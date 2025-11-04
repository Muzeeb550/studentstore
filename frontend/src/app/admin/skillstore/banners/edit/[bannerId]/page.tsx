'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Skill {
  id: number;
  name: string;
}

interface BannerFormData {
  image_url: string;
  display_order: number;
  redirect_type: string;
  redirect_skill_id: string;
  redirect_custom_url: string;
}

export default function EditBannerPage() {
  const router = useRouter();
  const params = useParams();
  const bannerId = parseInt(params.bannerId as string);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<BannerFormData>({
    image_url: '',
    display_order: 0,
    redirect_type: 'none',
    redirect_skill_id: '',
    redirect_custom_url: ''
  });

  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchBannerData();
    fetchSkills();
  }, []);

  const fetchBannerData = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/banners/${bannerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.status === 'success') {
        const banner = result.data;
        setFormData({
          image_url: banner.image_url,
          display_order: banner.display_order,
          redirect_type: banner.redirect_type || 'none',
          redirect_skill_id: banner.redirect_skill_id?.toString() || '',
          redirect_custom_url: banner.redirect_custom_url || ''
        });
        setImagePreview(banner.image_url);
        setError('');
      } else {
        setError(result.message || 'Banner not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load banner');
    } finally {
      setLoading(false);
    }
  };

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skills`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.status === 'success') {
        setSkills(result.data);
      }
    } catch (error) {
      console.error('Fetch skills error:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const authResult = await authResponse.json();
      
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
          image_url: uploadResult.url
        }));
        setImagePreview(uploadResult.url);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.image_url) {
      setError('Please upload a banner image');
      return;
    }

    if (formData.redirect_type === 'skill' && !formData.redirect_skill_id) {
      setError('Please select a skill to redirect to');
      return;
    }

    if (formData.redirect_type === 'custom' && !formData.redirect_custom_url) {
      setError('Please enter a custom URL');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/banners/${bannerId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: formData.image_url,
          display_order: parseInt(formData.display_order.toString()),
          redirect_type: formData.redirect_type,
          redirect_skill_id: formData.redirect_skill_id ? parseInt(formData.redirect_skill_id) : null,
          redirect_custom_url: formData.redirect_custom_url || null
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Banner updated successfully!');
        router.push('/admin/skillstore/banners');
      } else {
        setError(result.message || 'Failed to update banner');
      }
    } catch (error) {
      console.error('Update banner error:', error);
      setError('Failed to update banner. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !formData.image_url) {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/skillstore/banners" className="text-blue-600 mb-4 inline-block">
          ← Back to Banners
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Banner</h1>
          <p className="text-gray-600">Update carousel banner</p>
        </div>
        <Link 
          href="/admin/skillstore/banners"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Banners
        </Link>
      </div>

      {/* Error Display */}
      {error && formData.image_url && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Edit Banner Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image <span className="text-red-500">*</span>
            </label>
            
            {imagePreview && (
              <div className="mb-4">
                <img 
                  src={imagePreview} 
                  alt="Banner preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
                id="image-upload"
              />
              <label 
                htmlFor="image-upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Change Image'}
              </label>
            </div>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.display_order}
              onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Redirect Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Redirect Type
            </label>
            <select
              value={formData.redirect_type}
              onChange={(e) => setFormData(prev => ({ ...prev, redirect_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="none">No Redirect (Static Banner)</option>
              <option value="skill">Link to Skill</option>
              <option value="custom">Custom URL</option>
            </select>
          </div>

          {/* Redirect to Skill */}
          {formData.redirect_type === 'skill' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Skill <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.redirect_skill_id}
                onChange={(e) => setFormData(prev => ({ ...prev, redirect_skill_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a skill...</option>
                {skills.map(skill => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom URL */}
          {formData.redirect_type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.redirect_custom_url}
                onChange={(e) => setFormData(prev => ({ ...prev, redirect_custom_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
                required
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Link
              href="/admin/skillstore/banners"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
