'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Skill {
  id: number;
  name: string;
}

export default function CreateBannerPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    image_url: '',
    display_order: 0,
    redirect_type: 'none', // 'none', 'skill', 'custom'
    redirect_skill_id: '',
    redirect_custom_url: ''
  });

  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skills`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
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

    // Validate file
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
      
      // Get ImageKit authentication
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth`, {
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
          image_url: uploadResult.url
        }));
        setImagePreview(uploadResult.url);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
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

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/banners`, {
        method: 'POST',
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
        alert('Banner created successfully!');
        router.push('/admin/skillstore/banners');
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
          <h1 className="text-3xl font-bold text-gray-900">Create Banner</h1>
          <p className="text-gray-600">Add a new carousel banner for SkillStore homepage</p>
        </div>
        <a 
          href="/admin/skillstore/banners"
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
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mb-4">PNG, JPG, GIF up to 5MB</p>
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
                {uploading ? 'Uploading...' : 'Select Image'}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Recommended size: 1200x400px</p>
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
              placeholder="0"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in carousel</p>
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

          {/* Redirect to Skill (conditional) */}
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
              {skills.length === 0 && (
                <p className="text-sm text-orange-600 mt-2">
                  No skills created yet. <a href="/admin/skillstore/skills/create" className="underline">Create a skill first</a>
                </p>
              )}
            </div>
          )}

          {/* Custom URL (conditional) */}
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
            <a
              href="/admin/skillstore/banners"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
