'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Bookmark {
  id: number;
  bookmark_id: number;
  bookmarked_at: string;
  name: string;
  card_image_url: string;
  has_details: boolean;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        setError('Please login to view bookmarks');
        setLoading(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/skillstore/bookmarks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.status === 'success') {
        setBookmarks(result.data.bookmarks);
        setError('');
      } else {
        setError(result.message || 'Failed to load bookmarks');
      }
    } catch (error) {
      console.error('Fetch bookmarks error:', error);
      setError('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (skillId: number) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/skillstore/bookmarks/remove/${skillId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.status === 'success') {
        setBookmarks(bookmarks.filter(b => b.id !== skillId));
      }
    } catch (error) {
      console.error('Remove bookmark error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-semibold">{error}</p>
            {error.includes('login') && (
              <Link href="/" className="text-red-600 hover:text-red-700 font-medium mt-4 inline-block">
                Go to Login
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <Link href="/skillstore" className="text-purple-600 hover:text-purple-700 font-medium mb-4 inline-block">
            ← Back to SkillStore
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">My Bookmarked Skills</h1>
          <p className="text-gray-600 mt-2">Skills you're interested in</p>
        </div>

        {/* Content */}
        {bookmarks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Bookmarks Yet</h2>
            <p className="text-gray-600 mb-6">Start bookmarking skills to keep track of ones you want to learn</p>
            <Link
              href="/skillstore"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Explore Skills
            </Link>
          </div>
        ) : (
          <div>
            {/* Stats */}
            <div className="mb-6 bg-white rounded-lg shadow-sm border p-4">
              <p className="text-gray-700">
                You have <span className="font-bold text-purple-600">{bookmarks.length}</span> bookmarked skill{bookmarks.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarks.map((bookmark) => (
                <div key={bookmark.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                  
                  {/* Skill Image */}
                  <div className="aspect-square bg-gray-100 relative overflow-hidden group">
                    <img
                      src={bookmark.card_image_url}
                      alt={bookmark.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                      className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>

                    {/* Bookmarked Date */}
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-semibold">
                      {new Date(bookmark.bookmarked_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Skill Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{bookmark.name}</h3>
                    
                    {bookmark.has_details ? (
                      <Link
                        href={`/skillstore/${bookmark.id}`}
                        className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-center font-medium transition-colors"
                      >
                        View Details →
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="block w-full bg-gray-300 text-gray-600 px-4 py-2 rounded-lg text-center font-medium cursor-not-allowed"
                      >
                        Details Coming Soon
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
