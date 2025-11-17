'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PostsProvider, usePosts } from '../context/PostsContext';
import PostCard from '../components/PostCard';
import RecommendModal from '../components/modals/RecommendModal';
import Navbar from '../components/Navbar';
import Link from 'next/link';

function PostsContent() {
  const searchParams = useSearchParams();
  // ✅ UPDATED: Added sortBy and setSortBy
  const { posts, loading, error, fetchPosts, currentPage, totalPages, hasMore, sortBy, setSortBy } = usePosts();
  
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [isClientLoading, setIsClientLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ✅ NEW: Handle sort changes
  const handleSortChange = async (newSort: 'hot' | 'new' | 'top') => {
    if (newSort === sortBy) return; // Already on this sort
    
    setSortBy(newSort);
    setFilteredPosts([]);
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Wait a bit for scroll, then fetch posts with new sort
    setTimeout(async () => {
      await fetchPosts(1, newSort);
    }, 100);
  };

  // ✅ IMPROVED SCROLL RESTORATION - Instant jump with flash highlight
  useEffect(() => {
    const savedPostId = sessionStorage.getItem('lastViewedPostId');
    const savedScroll = sessionStorage.getItem('postsScrollPosition');
    
    if (savedPostId && posts.length > 0) {
      const postId = parseInt(savedPostId);
      
      const timer = setTimeout(() => {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        
        if (postElement) {
          // ✅ Instant scroll (no animation)
          postElement.scrollIntoView({ 
            behavior: 'instant',
            block: 'center' 
          });
          
          // ✅ Add flash highlight effect
          postElement.classList.add('flash-highlight');
          setTimeout(() => {
            postElement.classList.remove('flash-highlight');
          }, 1500);
          
          sessionStorage.removeItem('lastViewedPostId');
          sessionStorage.removeItem('postsScrollPosition');
        } else if (hasMore && !loading) {
          // ⏳ Post not found - load next page automatically
          console.log(`📦 Post #${postId} not found, loading page ${currentPage + 1}...`);
          fetchPosts(currentPage + 1, sortBy);
        } else if (savedScroll && !hasMore) {
          // ⚠️ Post not found and no more pages - fallback
          console.log(`⚠️ Post #${postId} not found, using scroll position fallback`);
          window.scrollTo({
            top: parseInt(savedScroll),
            behavior: 'instant'
          });
          sessionStorage.removeItem('postsScrollPosition');
          sessionStorage.removeItem('lastViewedPostId');
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [posts, hasMore, loading, currentPage, fetchPosts, sortBy]);

  // ✅ INFINITE SCROLL - Auto-load when near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || !hasMore || loading) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomPosition = document.documentElement.scrollHeight - 800;
      
      if (scrollPosition >= bottomPosition) {
        setIsLoadingMore(true);
        fetchPosts(currentPage + 1, sortBy).finally(() => { // ✅ UPDATED: Pass sortBy
          setIsLoadingMore(false);
        });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPage, hasMore, loading, isLoadingMore, fetchPosts, sortBy]);

  useEffect(() => {
    setIsClientLoading(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('studentstore_token');
    setIsAuthenticated(!!token);
    
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(decodeURIComponent(searchParam));
    }
  }, [searchParams]);

  useEffect(() => {
    const highlightedPostId = searchParams.get('highlight');
    
    if (highlightedPostId && !searchQuery.trim()) {
      const highlightId = parseInt(highlightedPostId);
      let highlightedPost = posts.find(p => p.id === highlightId);
      
      if (!highlightedPost) {
        const fetchAndHighlight = async () => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/posts/post/${highlightId}`);
            const data = await response.json();
            
            if (data.status === 'success') {
              const fetchedPost = data.data.post;
              const otherPosts = posts.filter(p => p.id !== highlightId);
              setFilteredPosts([fetchedPost, ...otherPosts]);
              
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 100);
              return;
            }
          } catch (error) {
            console.error('Error fetching highlighted post:', error);
            setFilteredPosts(posts);
          }
        };
        
        fetchAndHighlight();
        return;
      }
      
      const otherPosts = posts.filter(p => p.id !== highlightId);
      setFilteredPosts([highlightedPost, ...otherPosts]);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredPosts(posts);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    
    const userMatch = query.match(/user:(\S+)/);
    const userEmail = userMatch ? userMatch[1] : null;
    
    const cleanQuery = query.replace(/user:\S+/g, '').trim();
    const queryWords = cleanQuery ? cleanQuery.split(/\s+/) : [];
    
    const scoredPosts = posts.map(post => {
      const username = (post.username || '').toLowerCase();
      const productName = (post.product_name || '').toLowerCase();
      const postEmail = (post.user_email || '').toLowerCase();
      
      let score = 0;
      let matchedWords = 0;
      
      const isExactUser = userEmail && postEmail === userEmail;
      if (isExactUser) {
        score += 100;
      }
      
      if (queryWords.length > 0) {
        queryWords.forEach(word => {
          const matchesProductName = productName.includes(word);
          const matchesUsername = username.includes(word);
          
          if (matchesProductName) {
            score += isExactUser ? 50 : 10;
            matchedWords++;
          }
          if (matchesUsername) {
            score += 5;
            matchedWords++;
          }
        });
      }
      
      return {
        post,
        score,
        matchedWords,
        isMatch: score > 0
      };
    });
    
    scoredPosts.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.matchedWords - a.matchedWords;
    });
    
    const matchingPosts = scoredPosts.filter(item => item.isMatch).map(item => item.post);
    const nonMatchingPosts = scoredPosts.filter(item => !item.isMatch).map(item => item.post);
    
    setFilteredPosts([...matchingPosts, ...nonMatchingPosts]);
  }, [searchQuery, posts, searchParams]);

  const clearSearch = () => {
    setSearchQuery('');
    window.history.replaceState({}, '', '/posts');
  };

  if (isClientLoading || (loading && posts.length === 0)) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }
  
  if (error && posts.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold">{error}</p>
        </div>
        <button
          onClick={() => fetchPosts(1)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  if (posts.length === 0) {
    return (
      <>
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                  📝 Student Posts
                </h2>
                <p className="text-gray-600 text-sm md:text-base">
                  Real reviews and recommendations from fellow students. Share your favorite products and help others make better choices!
                </p>
              </div>
              
              {mounted && isAuthenticated && (
                <button
                  onClick={() => setShowAddPostModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2 whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Post
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center py-20">
          <div className="text-gray-400 mb-4">
            <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-xl font-semibold text-gray-600">No posts yet</p>
            <p className="text-gray-500 mt-2">Be the first to share your favorite product!</p>
            {mounted && isAuthenticated && (
              <button
                onClick={() => setShowAddPostModal(true)}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105"
              >
                Add Your First Post
              </button>
            )}
          </div>
        </div>

        <RecommendModal 
          isOpen={showAddPostModal} 
          onClose={() => setShowAddPostModal(false)} 
          mode="post"
        />
      </>
    );
  }

  const highlightedPostId = searchParams.get('highlight');
  const matchingCount = highlightedPostId 
    ? 1 
    : searchQuery.trim() 
      ? posts.filter(post => {
          const query = searchQuery.toLowerCase().trim();
          const userMatch = query.match(/user:(\S+)/);
          const userEmail = userMatch ? userMatch[1] : null;
          const cleanQuery = query.replace(/user:\S+/g, '').trim();
          const queryWords = cleanQuery ? cleanQuery.split(/\s+/) : [];
          
          const username = (post.username || '').toLowerCase();
          const productName = (post.product_name || '').toLowerCase();
          const postEmail = (post.user_email || '').toLowerCase();
          
          const matchesUser = userEmail && postEmail === userEmail;
          const matchesWords = queryWords.length === 0 || queryWords.some(word => 
            username.includes(word) || productName.includes(word)
          );
          
          return matchesUser || matchesWords;
        }).length 
      : 0;

  return (
    <div className="space-y-8">
      {/* ✅ Flash Highlight CSS */}
      <style jsx>{`
        @keyframes flashHighlight {
          0% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 15px rgba(99, 102, 241, 0);
            transform: scale(1.02);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
            transform: scale(1);
          }
        }

        :global(.flash-highlight) {
          animation: flashHighlight 1.5s ease-out;
        }
      `}</style>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              📝 Student Posts
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Real reviews and recommendations from fellow students. Share your favorite products and help others make better choices!
            </p>
          </div>
          
          {mounted && isAuthenticated && (
            <button
              onClick={() => setShowAddPostModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Post
            </button>
          )}
        </div>
      </div>

      {/* ✅ NEW: Sort Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-600">Sort by:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSortChange('hot')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  sortBy === 'hot'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                🔥 Hot
              </button>
              <button
                onClick={() => handleSortChange('new')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  sortBy === 'new'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                ⭐ New
              </button>
              <button
                onClick={() => handleSortChange('top')}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  sortBy === 'top'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                👑 Top
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center sm:text-right">
            {sortBy === 'hot' && '🔥 Popular + Recent posts'}
            {sortBy === 'new' && '⭐ Newest posts first'}
            {sortBy === 'top' && '👑 Most liked posts'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by username or product name..."
              className="w-full pl-11 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm md:text-base"
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {matchingCount} {matchingCount === 1 ? 'match' : 'matches'}
            </div>
          )}
        </div>
        
        {(searchQuery.trim() || highlightedPostId) && matchingCount > 0 && (
          <div className={`mt-3 p-3 rounded-lg border ${
            highlightedPostId 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-sm ${highlightedPostId ? 'text-green-700' : 'text-blue-700'}`}>
              {highlightedPostId 
                ? '🎯 Your selected post is shown at the top' 
                : `🔍 Showing ${matchingCount} matching ${matchingCount === 1 ? 'post' : 'posts'} at the top`
              }
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map((post, index) => {
          const highlightedPostId = searchParams.get('highlight');
          const isHighlighted = highlightedPostId && post.id === parseInt(highlightedPostId);
          
          const query = searchQuery.toLowerCase().trim();
          const userMatch = query.match(/user:(\S+)/);
          const userEmail = userMatch ? userMatch[1] : null;
          const cleanQuery = query.replace(/user:\S+/g, '').trim();
          const queryWords = cleanQuery ? cleanQuery.split(/\s+/) : [];
          
          const username = (post.username || '').toLowerCase();
          const productName = (post.product_name || '').toLowerCase();
          const postEmail = (post.user_email || '').toLowerCase();
          
          const isExactUser = userEmail && postEmail === userEmail;
          const matchesWords = queryWords.length === 0 || queryWords.some(word => 
            username.includes(word) || productName.includes(word)
          );
          
          const isSearchMatch = searchQuery.trim() && (isExactUser || matchesWords);
          const isMatch = isHighlighted || isSearchMatch;
          
          return (
            <div key={post.id} className="relative" data-post-id={post.id}>
              {isMatch && (
                <div className={`absolute -top-2 -left-2 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg z-10 ${
                  isHighlighted 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                    : isExactUser
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}>
                  {isHighlighted || isExactUser ? '🎯 Your Post' : '✨ Match'}
                </div>
              )}
              <PostCard post={post} />
            </div>
          );
        })}
      </div>

      {isLoadingMore && hasMore && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600 font-medium">Loading more posts...</p>
          </div>
        </div>
      )}

      {hasMore && !isLoadingMore && (
        <div className="flex flex-col items-center gap-4 mt-12 mb-8">
          <p className="text-xs text-gray-500 italic">Scroll down to load more, or click the button</p>
          <button
            onClick={() => {
              setIsLoadingMore(true);
              fetchPosts(currentPage + 1, sortBy).finally(() => setIsLoadingMore(false)); // ✅ UPDATED
            }}
            disabled={loading}
            className={`px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
              loading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 hover:-translate-y-1'
            }`}
          >
            <span className="flex items-center gap-2">
              Load More Posts
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          
          <p className="text-sm text-gray-500">
            Showing {posts.length} posts • Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-12 border-t border-gray-200">
          <div className="text-gray-500">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-lg font-semibold text-gray-700">You've reached the end!</p>
            <p className="text-sm text-gray-500 mt-2">You've seen all {posts.length} posts. Check back later for new content.</p>
          </div>
        </div>
      )}

      <RecommendModal 
        isOpen={showAddPostModal} 
        onClose={() => setShowAddPostModal(false)} 
        mode="post"
      />
    </div>
  );
}

function PostsPageContent() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 py-4">
            <Link 
              href="/"
              className="px-6 py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              🏠 Products
            </Link>
            <Link 
              href="/posts"
              className="px-6 py-2.5 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 bg-indigo-600 text-white shadow-md"
            >
              📝 Posts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <PostsProvider>
          <Suspense fallback={
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading posts...</p>
              </div>
            </div>
          }>
            <PostsContent />
          </Suspense>
        </PostsProvider>
      </div>

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 group"
          aria-label="Scroll to top"
        >
          <svg 
            className="w-6 h-6 transform group-hover:-translate-y-0.5 transition-transform" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}
    </>
  );
}

export default function PostsPage() {
  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />
      <PostsPageContent />
    </div>
  );
}
