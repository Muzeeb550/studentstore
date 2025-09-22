'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
  id: number;
  name: string;
  description: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category_id: number;
  image_urls: string[];
  buy_button_1_name: string;
  buy_button_1_url: string;
  buy_button_2_name: string;
  buy_button_2_url: string;
  buy_button_3_name: string;
  buy_button_3_url: string;
}

export default function CreateProduct() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState([false, false, false]);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    category_id: 0,
    image_urls: ['', '', ''],
    buy_button_1_name: '',
    buy_button_1_url: '',
    buy_button_2_name: '',
    buy_button_2_url: '',
    buy_button_3_name: '',
    buy_button_3_url: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.status === 'success') {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Fetch categories error:', error);
    }
  };

  const handleImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
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

    // Set uploading state for this image
    const newUploading = [...uploading];
    newUploading[index] = true;
    setUploading(newUploading);

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
      uploadData.append('fileName', `product_${Date.now()}_${file.name}`);
      uploadData.append('folder', '/studentstore/products');
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
        const newImageUrls = [...formData.image_urls];
        newImageUrls[index] = uploadResult.url;
        setFormData(prev => ({
          ...prev,
          image_urls: newImageUrls
        }));
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      // Reset uploading state
      const newUploading = [...uploading];
      newUploading[index] = false;
      setUploading(newUploading);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.description || !formData.category_id) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.image_urls[0]) {
      setError('Please upload at least one product image');
      return;
    }

    if (!formData.buy_button_1_name || !formData.buy_button_1_url) {
      setError('Please provide the first purchase button details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      
      // Filter out empty image URLs
      const filteredImageUrls = formData.image_urls.filter(url => url.trim() !== '');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          image_urls: filteredImageUrls
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Product created successfully!');
        router.push('/admin/products');
      } else {
        setError(result.message || 'Failed to create product');
      }
    } catch (error) {
      console.error('Create product error:', error);
      setError('Failed to create product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
          <p className="text-gray-600">Add a new affiliate product to your store</p>
        </div>
        <a 
          href="/admin/products"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Products
        </a>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Create Product Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Product Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter product name"
                required
              />
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value={0}>Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Describe the product features, benefits, and why students should consider it..."
              required
            />
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Product Images <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Image 1 (Required) */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Image 1 (Required)</div>
                {formData.image_urls[0] && (
                  <img 
                    src={formData.image_urls[0]} 
                    alt="Product image 1"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(0, e)}
                  disabled={uploading[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {uploading[0] && <div className="text-sm text-green-600">Uploading...</div>}
              </div>

              {/* Image 2 (Optional) */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Image 2 (Optional)</div>
                {formData.image_urls[1] && (
                  <img 
                    src={formData.image_urls[1]} 
                    alt="Product image 2"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(1, e)}
                  disabled={uploading[1]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {uploading[1] && <div className="text-sm text-green-600">Uploading...</div>}
              </div>

              {/* Image 3 (Optional) */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Image 3 (Optional)</div>
                {formData.image_urls[2] && (
                  <img 
                    src={formData.image_urls[2]} 
                    alt="Product image 3"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(2, e)}
                  disabled={uploading[2]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {uploading[2] && <div className="text-sm text-green-600">Uploading...</div>}
              </div>
            </div>
          </div>

          {/* Purchase Buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Purchase Buttons
            </label>
            
            {/* Button 1 (Required) */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-gray-600 mb-3">Button 1 (Required)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.buy_button_1_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_1_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Buy from Amazon"
                  required
                />
                <input
                  type="url"
                  value={formData.buy_button_1_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_1_url: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://www.amazon.com/product..."
                  required
                />
              </div>
            </div>

            {/* Button 2 (Optional) */}
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-gray-600 mb-3">Button 2 (Optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.buy_button_2_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_2_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Buy from Flipkart"
                />
                <input
                  type="url"
                  value={formData.buy_button_2_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_2_url: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://www.flipkart.com/product..."
                />
              </div>
            </div>

            {/* Button 3 (Optional) */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-600 mb-3">Button 3 (Optional)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.buy_button_3_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_3_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Buy from Official Store"
                />
                <input
                  type="url"
                  value={formData.buy_button_3_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_3_url: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://store.example.com/product..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <a
              href="/admin/products"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || uploading.some(u => u)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating Product...' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
