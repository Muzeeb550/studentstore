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

  // 🚀 NEW: Cache invalidation helper
  const invalidateBannerCaches = () => {
    console.log('🔄 Invalidating banner caches');
    
    // Clear homepage banner cache
    localStorage.removeItem('studentstore_cache_banners');
    localStorage.removeItem('studentstore_cache_homepage');
    
    // Clear admin banner list cache
    localStorage.removeItem('studentstore_admin_banners');
    
    // Clear all homepage-related caches
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('studentstore_cache_') || key?.startsWith('studentstore_admin_banners')) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    
    console.log(`✅ Cleared ${keys.length + 3} banner cache entries`);
  };

  // 🚀 NEW: Dispatch cache invalidation events
  const dispatchCacheInvalidation = (action: 'create' | 'update' | 'delete') => {
    // Dispatch admin update event
    window.dispatchEvent(new CustomEvent('adminUpdate', {
      detail: { 
        type: 'banner', 
        action,
        timestamp: Date.now()
      }
    }));
    
    // Dispatch homepage update event
    window.dispatchEvent(new CustomEvent('homepageUpdate', {
      detail: { 
        type: 'banner', 
        action,
        timestamp: Date.now()
      }
    }));
    
    console.log(`📢 Dispatched ${action} banner events`);
  };

  // 🚀 ENHANCED: Media upload with better error handling
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
    setError(''); // Clear any previous errors
    
    try {
      const token = localStorage.getItem('studentstore_token');
      
      // 🚀 ENHANCED: Better auth handling with retry logic
      let authResult;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          console.log(`📤 Getting ImageKit auth for banner upload (attempt ${retryCount + 1})`);
          
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth?usage=banner&priority=high`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (authResponse.status === 429) {
            const retryAfter = authResponse.headers.get('Retry-After') || '60';
            const waitTime = Math.min(parseInt(retryAfter) * 1000, 10000); // Max 10 seconds
            
            if (retryCount === maxRetries - 1) {
              throw new Error(`Upload limit reached. Please wait a few minutes before uploading more banner media.`);
            }
            
            console.log(`⏳ Rate limited, waiting ${waitTime/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
            continue;
          }

          if (!authResponse.ok) {
            throw new Error(`Authentication failed: ${authResponse.status}`);
          }

          authResult = await authResponse.json();
          console.log('✅ ImageKit auth successful for banner upload');
          break;

        } catch (error) {
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          const backoffTime = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`⏳ Auth attempt ${retryCount} failed, retrying in ${backoffTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }

      const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error('Upload configuration missing. Please contact support.');
      }

      // 🚀 ENHANCED: Upload with better file naming and metadata
      const uploadData = new FormData();
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      uploadData.append('file', file);
      uploadData.append('fileName', `banner_${timestamp}_${sanitizedFileName}`);
      uploadData.append('folder', '/studentstore/banners');
      uploadData.append('token', authResult.token);
      uploadData.append('signature', authResult.signature);
      uploadData.append('expire', authResult.expire.toString());
      uploadData.append('publicKey', publicKey);
      uploadData.append('tags', `banner,admin_upload,uploaded_${timestamp}`);

      console.log('📤 Uploading banner media to ImageKit...');

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: uploadData
      });

      let uploadResult;
      try {
        uploadResult = await uploadResponse.json();
      } catch (parseError) {
        console.error('❌ Failed to parse ImageKit response:', parseError);
        throw new Error('Invalid response from image upload service');
      }

      if (uploadResponse.ok && uploadResult.url) {
        setFormData(prev => ({
          ...prev,
          media_url: uploadResult.url
        }));
        console.log(`✅ Banner media uploaded successfully: ${uploadResult.url}`);
      } else {
        console.error('❌ ImageKit upload failed:', uploadResult);
        throw new Error(uploadResult.message || 'Upload to ImageKit failed');
      }
    } catch (error) {
      console.error('❌ Banner media upload error:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // 🚀 ENHANCED: Better error messages
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        setError('📸 Upload limit reached! Please wait a few minutes before uploading more banner media. Banners have a generous limit of 50 uploads per hour.');
      } else if (errorMessage.includes('Authentication failed')) {
        setError('🔒 Authentication failed. Please try signing in again.');
      } else if (errorMessage.includes('Upload configuration missing')) {
        setError('⚙️ Upload system configuration error. Please contact support.');
      } else if (errorMessage.includes('Invalid response')) {
        setError('🔧 Image upload service returned invalid response. Please try again.');
      } else {
        setError(`❌ Failed to upload media: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  // 🚀 ENHANCED: Form submission with real-time cache invalidation
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
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      console.log('📤 Creating banner...', formData);
      
      const response = await fetch(`${apiUrl}/api/admin/banners`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        console.log('✅ Banner created successfully');
        
        // 🚀 NEW: Immediate cache invalidation
        invalidateBannerCaches();
        
        // 🚀 NEW: Dispatch events for real-time updates
        dispatchCacheInvalidation('create');
        
        // 🚀 NEW: Show success feedback
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('showToast', {
            detail: {
              type: 'success',
              message: '🎉 Banner created successfully! Homepage updated instantly.',
              duration: 5000
            }
          }));
        }
        
        // Navigate back to banners list
        router.push('/admin/banners');
      } else {
        setError(result.message || 'Failed to create banner');
      }
    } catch (error) {
      console.error('❌ Create banner error:', error);
      setError('Failed to create banner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Enhanced Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎨 Create New Banner</h1>
          <p className="text-gray-600">Add a promotional banner for your homepage with real-time updates</p>
        </div>
        <a 
          href="/admin/banners"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Banners
        </a>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Enhanced Create Banner Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Enhanced Banner Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏷️ Banner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., Back to School Sale, Hot Deal Alert, Student Discount Banner"
              required
              disabled={loading}
            />
          </div>

          {/* Enhanced Banner Media Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎬 Banner Image/Video <span className="text-red-500">*</span>
            </label>
            
            {formData.media_url && (
              <div className="mb-4">
                {formData.media_url.includes('.mp4') || formData.media_url.includes('.webm') ? (
                  <video 
                    src={formData.media_url} 
                    className="w-full h-48 object-cover rounded-lg border shadow-sm"
                    controls
                    muted
                  />
                ) : (
                  <img 
                    src={formData.media_url} 
                    alt="Banner preview"
                    className="w-full h-48 object-cover rounded-lg border shadow-sm"
                  />
                )}
                <div className="mt-2 text-sm text-green-600 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Media uploaded successfully
                </div>
              </div>
            )}
            
            <input
              type="file"
              accept="image/*,video/mp4,video/webm"
              onChange={handleMediaUpload}
              disabled={uploading || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 transition-all duration-200"
            />
            
            {uploading && (
              <div className="mt-2 text-sm text-green-600 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-600 border-t-transparent mr-2"></div>
                Uploading media to cloud storage...
              </div>
            )}
            
            <p className="mt-1 text-sm text-gray-500">
              📁 Supported formats: JPG, PNG, GIF, WebP, MP4, WebM (Max: 50MB)<br/>
              💡 Recommended size: 1920x400px for desktop banners
            </p>
          </div>

          {/* Enhanced Link URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔗 Destination URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              placeholder="https://example.com/sale"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              🎯 Where should users go when they click this banner?
            </p>
          </div>

          {/* Enhanced Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Display Order
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.display_order}
              onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              📋 Lower numbers appear first (1 = first, 2 = second, etc.)
            </p>
          </div>

          {/* Enhanced Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <a
              href="/admin/banners"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-all duration-200 flex items-center"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-8 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Creating Banner...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  🚀 Create Banner
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 🚀 NEW: Real-time Updates Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-800 font-medium">⚡ Real-Time Updates</p>
            <p className="text-blue-700 text-sm mt-1">
              Your new banner will appear on the homepage instantly after creation, with automatic cache invalidation across all pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
