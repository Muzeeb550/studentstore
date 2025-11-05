'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useBookmarks } from '../../context/BookmarkContext';

interface Skill {
  id: number;
  name: string;
  card_image_url: string;
  has_details: boolean;
  bookmark_count: string;
}

// ✅ NEW: Separate component for search content that uses useSearchParams
function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const hasFetchedRef = useRef(false);
  const previousQueryRef = useRef('');
  
  const { bookmarkedSkills, addBookmark, removeBookmark, checkBookmarks } = useBookmarks();

  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!query || query.trim().length === 0) {
        setSkills([]);
        setLoading(false);
        return;
      }

      if (query !== previousQueryRef.current) {
        hasFetchedRef.current = false;
        previousQueryRef.current = query;
      }

      if (hasFetchedRef.current) {
        return;
      }

      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const response = await fetch(
          `${apiUrl}/api/skillstore/search?q=${encodeURIComponent(query)}`
        );
        const result = await response.json();

        if (result.status === 'success') {
          setSkills(result.data);
          
          const skillIds = result.data.map((s: Skill) => s.id);
          if (user && skillIds.length > 0) {
            checkBookmarks(skillIds);
          }
          
          hasFetchedRef.current = true;
        }
      } catch (error) {
        console.error('Search error:', error);
        setSkills([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [query, user, checkBookmarks]);

  const handleBookmark = async (skillId: number) => {
    if (!user) {
      alert('Please login to bookmark skills');
      return;
    }

    if (bookmarkedSkills[skillId]) {
      await removeBookmark(skillId);
    } else {
      await addBookmark(skillId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">
              Search Results
            </h1>
            <p className="text-gray-600 mt-2">
              {loading ? (
                'Loading...'
              ) : skills.length > 0 ? (
                <>
                  Found <span className="font-bold text-purple-600">{skills.length}</span> skill{skills.length !== 1 ? 's' : ''} for{' '}
                  <span className="font-bold text-purple-600">"{query}"</span>
                </>
              ) : (
                <>
                  No skills found for{' '}
                  <span className="font-bold text-purple-600">"{query}"</span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/skillstore"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Search Query Display */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            Searching for: <span className="font-bold text-purple-600">"{query}"</span>
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : skills.length === 0 ? (
        /* No Results State */
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No skills found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find any skills matching "<span className="font-bold">{query}</span>"
          </p>
          <div className="space-x-4">
            <Link
              href="/skillstore"
              className="inline-block px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Browse All Skills
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-block px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-medium transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      ) : (
        /* Skills Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div 
              key={skill.id} 
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Skill Image */}
              <div className="aspect-square bg-gray-100 relative overflow-hidden group">
                <img
                  src={skill.card_image_url}
                  alt={skill.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                  }}
                />
                
                {/* Bookmark Button */}
                <button
                  onClick={() => handleBookmark(skill.id)}
                  className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
                    bookmarkedSkills[skill.id]
                      ? 'bg-red-500 text-white'
                      : 'bg-white/90 text-gray-400 hover:text-red-500'
                  }`}
                  aria-label={bookmarkedSkills[skill.id] ? 'Remove bookmark' : 'Add bookmark'}
                >
                  <svg className="w-5 h-5" fill={bookmarkedSkills[skill.id] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Skill Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{skill.name}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  ⭐ {skill.bookmark_count} bookmark{skill.bookmark_count !== '1' ? 's' : ''}
                </p>
                
                <Link
                  href={`/skillstore/${skill.id}`}
                  className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-center font-medium transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ✅ Loading fallback component
function SearchPageLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    </div>
  );
}

// ✅ NEW: Main page component with Suspense
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}
