'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    fetchProductData();
    fetchCategories();
  }, [productId]);

  const fetchProductData = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        const product = result.data;
        
        // Parse image URLs
        let imageUrls = ['', '', ''];
        try {
          const parsedUrls = JSON.parse(product.image_urls || '[]');
          imageUrls = [
            parsedUrls[0] || '',
            parsedUrls[1] || '',
            parsedUrls[2] || ''
          ];
        } catch (e) {
          console.log('Error parsing image URLs');
        }

        setFormData({
          name: product.name || '',
          description: product.description || '',
          category_id: product.category_id || 0,
          image_urls: imageUrls,
          buy_button_1_name: product.buy_button_1_name || '',
          buy_button_1_url: product.buy_button_1_url || '',
          buy_button_2_name: product.buy_button_2_name || '',
          buy_button_2_url: product.buy_button_2_url || '',
          buy_button_3_name: product.buy_button_3_name || '',
          buy_button_3_url: product.buy_button_3_url || ''
        });
      } else {
        setError(result.message || 'Failed to load product');
      }
    } catch (error) {
      console.error('Fetch product error:', error);
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const response = await fetch('http://localhost:5000/api/admin/categories', {
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
      const authResponse = await fetch('http://localhost:5000/api/admin/imagekit-auth', {
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

    if (!formData.buy_button_1_name || !formData.buy_button_1_url) {
      setError('Please provide the first purchase button details');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      
      // Filter out empty image URLs
      const filteredImageUrls = formData.image_urls.filter(url => url.trim() !== '');
      
      const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
        method: 'PUT',
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
        alert('Product updated successfully!');
        router.push('/admin/products');
      } else {
        setError(result.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Update product error:', error);
      setError('Failed to update product. Please try again.');
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-gray-600">Update product information</p>
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

      {/* Edit Product Form */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the product features, benefits, and why students should consider it..."
              required
            />
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Product Images
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Image 1 */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-600">Image 1</div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {uploading[0] && <div className="text-sm text-blue-600">Uploading...</div>}
              </div>

              {/* Image 2 */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {uploading[1] && <div className="text-sm text-blue-600">Uploading...</div>}
              </div>

              {/* Image 3 */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {uploading[2] && <div className="text-sm text-blue-600">Uploading...</div>}
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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Buy from Amazon"
                  required
                />
                <input
                  type="url"
                  value={formData.buy_button_1_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_1_url: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Buy from Flipkart"
                />
                <input
                  type="url"
                  value={formData.buy_button_2_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_2_url: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Buy from Official Store"
                />
                <input
                  type="url"
                  value={formData.buy_button_3_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, buy_button_3_url: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              disabled={saving || uploading.some(u => u)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Updating Product...' : 'Update Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
