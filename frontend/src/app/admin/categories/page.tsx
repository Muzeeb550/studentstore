'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
  description: string;
  icon_url?: string;
  sort_order: number;
  is_active: boolean;
}

interface CategoryFormData {
  name: string;
  description: string;
  icon_url: string;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon_url: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

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
        setError('');
      } else {
        setError(result.message || 'Failed to load categories');
      }
    } catch (error) {
      console.error('Categories fetch error:', error);
      setError('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setCreatingCategory(true);
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon_url: '' });
    setError(''); // Clear any existing errors
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setCreatingCategory(false);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon_url: category.icon_url || ''
    });
    setError(''); // Clear any existing errors
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setCreatingCategory(false);
    setFormData({ name: '', description: '', icon_url: '' });
    setError(''); // Clear any existing errors
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Category deleted successfully!');
        fetchCategories();
      } else {
        alert(`Failed to delete category: ${result.message}`);
      }
    } catch (error) {
      console.error('Delete category error:', error);
      alert('Failed to delete category');
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
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('fileName', `category_${Date.now()}_${file.name}`);
      uploadFormData.append('folder', '/studentstore/categories');
      uploadFormData.append('token', authResult.token);
      uploadFormData.append('signature', authResult.signature);
      uploadFormData.append('expire', authResult.expire.toString());
      uploadFormData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: uploadFormData
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok) {
        setFormData(prev => ({
          ...prev,
          icon_url: uploadResult.url
        }));
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Category created successfully!');
        fetchCategories();
        handleCancelEdit();
      } else {
        setError(result.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      setError('Failed to create category');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCategory) return;

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/admin/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Category updated successfully!');
        fetchCategories();
        handleCancelEdit();
      } else {
        setError(result.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('Update category error:', error);
      setError('Failed to update category');
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
          <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
          <p className="text-gray-600">Create, edit, and manage product categories</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={handleCreateClick}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create New Category
          </button>
          <a 
            href="/admin/products"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ← Back to Products
          </a>
        </div>
      </div>

      {/* Global Error Display */}
      {error && !editingCategory && !creatingCategory && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={() => setError('')}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.length > 0 ? (
          categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-sm border p-6">
              {/* Category Thumbnail */}
              <div className="mb-4">
                {category.icon_url ? (
                  <img 
                    src={category.icon_url} 
                    alt={category.name}
                    className="w-16 h-16 rounded-lg object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiA0MkMyNC4yNjggNDIgMTggMzUuNzMyIDE4IDI4QzE4IDIwLjI2OCAyNC4yNjggMTQgMzIgMTRDMzkuNzMyIDE0IDQ2IDIwLjI2OCA0NiAyOEM0NiAzNS43MzIgMzkuNzMyIDQyIDMyIDQyWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    📁
                  </div>
                )}
              </div>

              {/* Category Info */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{category.description || 'No description provided'}</p>
              
              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEditClick(category)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id, category.name)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No categories found</div>
            <button
              onClick={handleCreateClick}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Create Your First Category
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Category Modal */}
      {(editingCategory || creatingCategory) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {creatingCategory ? 'Create New Category' : `Edit Category: ${editingCategory?.name}`}
            </h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={creatingCategory ? handleCreateCategory : handleUpdateCategory} className="space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter category name"
                  required
                />
              </div>

              {/* Category Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe this category"
                />
              </div>

              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Thumbnail
                </label>
                
                {formData.icon_url && (
                  <div className="mb-2">
                    <img 
                      src={formData.icon_url} 
                      alt="Category thumbnail"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                
                {uploading && (
                  <div className="mt-2 text-sm text-green-600">
                    Uploading image...
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {creatingCategory ? 'Create Category' : 'Update Category'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
