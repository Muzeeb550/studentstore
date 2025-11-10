'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ImageUploadWidget from '@/app/components/ImageUploadWidget';

interface Post {
  id: number;
  username: string;
  user_email: string;
  product_name: string;
  product_review: string;
  product_images: string[] | string;
  product_price: string;
  buy_link: string;
  buy_button_text: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  admin_name?: string;
  updated_at?: string;
  recommendation_id?: number | null;  // ✅ NEW
}

export default function AdminPostsPage() {
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const POSTS_PER_PAGE = 20;

  const [formData, setFormData] = useState({
    username: '',
    user_email: '',
    product_name: '',
    product_review: '',
    product_price: '',
    buy_link: '',
    buy_button_text: 'Buy Now',
    product_images: [] as string[],
    recommendation_id: null as number | null,  // ✅ NEW
  });

  const [submitting, setSubmitting] = useState(false);

  // ✅ NEW: Check if coming from recommendations page
  useEffect(() => {
    const fromRecommendation = searchParams.get('from');
    if (fromRecommendation === 'recommendation') {
      // Get recommendation data from URL params
      const recId = searchParams.get('rec_id');
      const recName = searchParams.get('rec_name');
      const recEmail = searchParams.get('rec_email');
      const recProduct = searchParams.get('rec_product');
      const recReview = searchParams.get('rec_review');
      const recPrice = searchParams.get('rec_price');
      const recLink = searchParams.get('rec_link');
      const recImages = searchParams.get('rec_images');

      if (recId && recName && recEmail && recProduct) {
        // Pre-fill form with recommendation data
        setFormData({
          username: decodeURIComponent(recName),
          user_email: decodeURIComponent(recEmail),
          product_name: decodeURIComponent(recProduct),
          product_review: recReview ? decodeURIComponent(recReview) : '',
          product_price: recPrice || '',
          buy_link: recLink ? decodeURIComponent(recLink) : '',
          buy_button_text: 'Buy Now',
          product_images: recImages ? JSON.parse(decodeURIComponent(recImages)) : [],
          recommendation_id: parseInt(recId),
        });
        setShowCreateForm(true);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = posts.filter(post => 
        post.product_name.toLowerCase().includes(query) ||
        post.username.toLowerCase().includes(query) ||
        post.user_email.toLowerCase().includes(query)
      );
      setFilteredPosts(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, posts]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = startIndex + POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

  const fetchPosts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('studentstore_token');

      const response = await fetch(`${apiUrl}/api/posts/admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        setPosts(result.data.posts);
        setFilteredPosts(result.data.posts);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('studentstore_token');

      const url = editingPost
        ? `${apiUrl}/api/posts/admin/${editingPost.id}`
        : `${apiUrl}/api/posts/admin`;

      const method = editingPost ? 'PUT' : 'POST';

      // ✅ UPDATED: Include recommendation_id in request
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.status === 'success') {
        const successMessage = editingPost 
          ? 'Post updated successfully!' 
          : formData.recommendation_id 
            ? 'Post created from recommendation successfully!' 
            : 'Post created successfully!';
        alert(successMessage);
        resetForm();
        fetchPosts();
      } else {
        alert(result.message || 'Failed to save post');
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('studentstore_token');

      const response = await fetch(`${apiUrl}/api/posts/admin/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Post deleted successfully!');
        fetchPosts();
      } else {
        alert(result.message || 'Failed to delete post');
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleEdit = (post: Post) => {
    setEditingPost(post);
    const images = Array.isArray(post.product_images) 
      ? post.product_images 
      : typeof post.product_images === 'string' 
        ? JSON.parse(post.product_images)
        : [];
    
    setFormData({
      username: post.username,
      user_email: post.user_email,
      product_name: post.product_name,
      product_review: post.product_review,
      product_price: post.product_price,
      buy_link: post.buy_link,
      buy_button_text: post.buy_button_text,
      product_images: images,
      recommendation_id: post.recommendation_id || null,  // ✅ NEW
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      user_email: '',
      product_name: '',
      product_review: '',
      product_price: '',
      buy_link: '',
      buy_button_text: 'Buy Now',
      product_images: [],
      recommendation_id: null,  // ✅ NEW
    });
    setEditingPost(null);
    setShowCreateForm(false);
  };

  const handleImageUpload = (urls: string[]) => {
    setFormData(prev => ({
      ...prev,
      product_images: [...prev.product_images, ...urls],
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      product_images: prev.product_images.filter((_, i) => i !== index),
    }));
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Posts Management</h1>
          <p className="text-gray-600 mt-1">Manage user-generated product recommendations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          {showCreateForm ? '✕ Cancel' : '➕ Create New Post'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          ⚠️ {error}
        </div>
      )}

      {/* ✅ NEW: Info banner when creating from recommendation */}
      {showCreateForm && formData.recommendation_id && !editingPost && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <span className="text-xl">🔗</span>
          <div>
            <p className="font-semibold">Creating post from recommendation</p>
            <p className="text-sm">This post will be linked to recommendation #{formData.recommendation_id}</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, recommender name, or email..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <svg 
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {filteredPosts.length} of {posts.length} posts
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingPost ? '✏️ Edit Post' : '➕ Create New Post'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recommender Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter student name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recommender Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.user_email}
                  onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="student@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter product name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Review *
              </label>
              <textarea
                required
                rows={5}
                value={formData.product_review}
                onChange={(e) => setFormData({ ...formData, product_review: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Write your product review..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.product_price}
                  onChange={(e) => setFormData({ ...formData, product_price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buy Button Text
                </label>
                <input
                  type="text"
                  value={formData.buy_button_text}
                  onChange={(e) => setFormData({ ...formData, buy_button_text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Buy Now"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buy Link (URL) *
              </label>
              <input
                type="url"
                required
                value={formData.buy_link}
                onChange={(e) => setFormData({ ...formData, buy_link: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://example.com/product"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>
              <ImageUploadWidget onUploadComplete={handleImageUpload} maxFiles={5} />
              
              {formData.product_images.length > 0 && (
                <div className="grid grid-cols-5 gap-3 mt-4">
                  {formData.product_images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={url} 
                        alt={`Product ${idx + 1}`} 
                        className="w-full h-24 object-cover rounded-lg border border-gray-200" 
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Saving...' : (editingPost ? '💾 Update Post' : '➕ Create Post')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reactions
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
            {paginatedPosts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{post.product_name}</div>
                      <div className="text-sm text-gray-500">by {post.username}</div>
                    </div>
                    {/* ✅ NEW: Show link icon if from recommendation */}
                    {post.recommendation_id && (
                      <span className="text-blue-500" title={`Linked to recommendation #${post.recommendation_id}`}>
                        🔗
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  ₹{parseFloat(post.product_price).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-3">
                    <span>👍 {post.likes_count}</span>
                    <span>👎 {post.dislikes_count}</span>
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm font-medium space-x-3">
                  <button
                    onClick={() => handleEdit(post)}
                    className="text-indigo-600 hover:text-indigo-900 transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-red-600 hover:text-red-900 transition"
                  >
                    🗑️ Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">
              {searchQuery ? '🔍' : '📝'}
            </div>
            <p>
              {searchQuery 
                ? `No posts found matching "${searchQuery}"` 
                : 'No posts yet. Create your first post!'}
            </p>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                Clear Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {filteredPosts.length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-white rounded-lg shadow-md p-4 border border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredPosts.length)} of {filteredPosts.length} posts
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1);

                const showEllipsis = 
                  (page === currentPage - 2 && currentPage > 3) ||
                  (page === currentPage + 2 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return <span key={page} className="px-2 text-gray-400">...</span>;
                }

                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      currentPage === page
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
