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
  const { posts, loading, error, fetchPosts, currentPage, totalPages, hasMore, sortBy, setSortBy } = usePosts();
  
  const [showAddPostModal, setShowAddPostModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [isClientLoading, setIsClientLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPosts, setFilteredPosts] = useState<any[]>([]);
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleSortChange = async (newSort: 'hot' | 'new' | 'top') => {
    if (newSort === sortBy) return;
    
    setSortBy(newSort);
    setFilteredPosts([]);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(async () => {
      await fetchPosts(1, newSort);
    }, 100);
  };

  useEffect(() => {
    const savedPostId = sessionStorage.getItem('lastViewedPostId');
    const savedScroll = sessionStorage.getItem('postsScrollPosition');
    
    if (savedPostId && posts.length > 0) {
      const postId = parseInt(savedPostId);
      
      const timer = setTimeout(() => {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        
        if (postElement) {
          postElement.scrollIntoView({ 
            behavior: 'instant',
            block: 'center' 
          });
          
          postElement.classList.add('flash-highlight');
          setTimeout(() => {
            postElement.classList.remove('flash-highlight');
          }, 1500);
          
          sessionStorage.removeItem('lastViewedPostId');
          sessionStorage.removeItem('postsScrollPosition');
        } else if (hasMore && !loading) {
          console.log(`📦 Post #${postId} not found, loading page ${currentPage + 1}...`);
          fetchPosts(currentPage + 1, sortBy);
        } else if (savedScroll && !hasMore) {
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

  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore || !hasMore || loading) return;
      
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomPosition = document.documentElement.scrollHeight - 800;
      
      if (scrollPosition >= bottomPosition) {
        setIsLoadingMore(true);
        fetchPosts(currentPage + 1, sortBy).finally(() => {
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
          <p className="text-gray-600 text-sm sm:text-base">Loading awesome posts...</p>
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
          <p className="text-base sm:text-lg font-semibold">{error}</p>
        </div>
        <button
          onClick={() => fetchPosts(1)}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // ✅ EMPTY STATE - No posts yet (RESPONSIVE)
  if (posts.length === 0) {
    return (
      <>
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 shadow-sm border border-purple-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
                  💎 Student Showcase
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium mb-1.5 sm:mb-2">
                  Show off what you own. Help others decide what to buy.
                </p>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed mb-2 sm:mb-3">
                  Got a <span className="font-semibold text-indigo-600">Gaming Laptop</span>? 
                  Fresh <span className="font-semibold text-purple-600">Sneakers</span>? 
                  New <span className="font-semibold text-blue-600">Headphones</span>? 
                  A <span className="font-semibold text-green-600">Study Table</span> that changed your productivity? 
                  Share it with a quick review and help your fellow students make smarter choices!
                </p>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full font-semibold border border-green-200 flex items-center gap-1">
                    <span>✨</span>
                    <span>Showcase</span>
                  </span>
                  <span className="text-gray-400 font-bold text-xs sm:text-sm">+</span>
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full font-semibold border border-blue-200 flex items-center gap-1">
                    <span>🤝</span>
                    <span>Help</span>
                  </span>
                  <span className="text-gray-400 font-bold text-xs sm:text-sm">=</span>
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 rounded-full font-semibold border border-orange-200 flex items-center gap-1">
                    <span>🏆</span>
                    <span>Win-Win!</span>
                  </span>
                </div>
              </div>
              
              {mounted && isAuthenticated && (
                <button
                  onClick={() => setShowAddPostModal(true)}
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap group text-sm sm:text-base"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Share Your Stuff</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center py-12 sm:py-20">
          <div className="max-w-2xl mx-auto px-4">
            <p className="text-xl sm:text-2xl font-bold text-gray-700 mb-2 sm:mb-3">
              🎤 The Stage is Yours!
            </p>
            <p className="text-base sm:text-lg text-gray-600 mb-3 sm:mb-4">
              Be the first to showcase your awesome gear and start helping the community.
            </p>
            
            {/* Post Ideas Grid */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 text-left">
              <p className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">💡 Post Ideas to Get Started:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-base sm:text-lg">💻</span>
                  <span>"My gaming laptop that survived 3 semesters"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base sm:text-lg">👟</span>
                  <span>"These sneakers—comfort for campus walks"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base sm:text-lg">🎧</span>
                  <span>"Noise-canceling headphones = study mode"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base sm:text-lg">📚</span>
                  <span>"This backpack fits everything + my laptop"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base sm:text-lg">⌚</span>
                  <span>"Smartwatch that tracks my all-nighters"</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base sm:text-lg">🎮</span>
                  <span>"Gaming mouse worth every rupee"</span>
                </div>
              </div>
            </div>

            {mounted && isAuthenticated && (
              <button
                onClick={() => setShowAddPostModal(true)}
                className="mt-4 sm:mt-6 px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-lg hover:shadow-lg transition-all hover:scale-105 inline-flex items-center gap-2 sm:gap-3"
              >
                <span>🚀 Create Your First Post</span>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
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

  // ✅ NORMAL STATE - With posts (RESPONSIVE)
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Flash Highlight CSS */}
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

      {/* ✅ UPDATED HEADER (RESPONSIVE) */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-purple-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 sm:mb-3 flex items-center gap-2">
              💎 Student Showcase
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium mb-1.5 sm:mb-2">
              Show off what you own. Help others decide what to buy.
            </p>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 leading-relaxed mb-2 sm:mb-3">
              Got a <span className="font-semibold text-indigo-600">Gaming Laptop</span>? 
              Fresh <span className="font-semibold text-purple-600">Sneakers</span>? 
              New <span className="font-semibold text-blue-600">Headphones</span>? 
              A <span className="font-semibold text-green-600">Study Table</span> that changed your productivity? 
              Share it with a quick review and help your fellow students make smarter choices!
            </p>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full font-semibold border border-green-200 flex items-center gap-1">
                <span>✨</span>
                <span>Showcase</span>
              </span>
              <span className="text-gray-400 font-bold text-xs sm:text-sm">+</span>
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full font-semibold border border-blue-200 flex items-center gap-1">
                <span>🤝</span>
                <span>Help</span>
              </span>
              <span className="text-gray-400 font-bold text-xs sm:text-sm">=</span>
              <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-700 rounded-full font-semibold border border-orange-200 flex items-center gap-1">
                <span>🏆</span>
                <span>Win-Win!</span>
              </span>
            </div>
          </div>
          
          {mounted && isAuthenticated && (
            <button
              onClick={() => setShowAddPostModal(true)}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 whitespace-nowrap group text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Share Your Stuff</span>
            </button>
          )}
        </div>
      </div>

      {/* ✅ UPDATED SORT TABS (RESPONSIVE) */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-semibold text-gray-600">Sort by:</span>
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => handleSortChange('hot')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  sortBy === 'hot'
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                🔥 Hot
              </button>
              <button
                onClick={() => handleSortChange('new')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  sortBy === 'new'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                ⭐ New
              </button>
              <button
                onClick={() => handleSortChange('top')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 ${
                  sortBy === 'top'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                }`}
              >
                👑 Top
              </button>
            </div>
          </div>
          
          <div className="text-[10px] sm:text-xs text-gray-500 text-center sm:text-right">
            {sortBy === 'hot' && '🔥 Trending posts getting the most love right now'}
            {sortBy === 'new' && '⭐ Fresh drops—see what students just posted'}
            {sortBy === 'top' && '👑 All-time favorites—the most liked posts ever'}
          </div>
        </div>
      </div>

      {/* ✅ UPDATED SEARCH BAR (RESPONSIVE) */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-3 sm:p-4 border border-gray-200">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 'Gaming Laptop', 'Sneakers'..."
              className="w-full pl-9 sm:pl-11 pr-8 sm:pr-10 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm md:text-base"
            />
            <svg 
              className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
              {matchingCount} {matchingCount === 1 ? 'match' : 'matches'}
            </div>
          )}
        </div>
        
        {(searchQuery.trim() || highlightedPostId) && matchingCount > 0 && (
          <div className={`mt-2 sm:mt-3 p-2 sm:p-3 rounded-lg border ${
            highlightedPostId 
              ? 'bg-green-50 border-green-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-xs sm:text-sm ${highlightedPostId ? 'text-green-700' : 'text-blue-700'}`}>
              {highlightedPostId 
                ? '🎯 Your selected post is shown at the top' 
                : `🔍 Showing ${matchingCount} matching ${matchingCount === 1 ? 'post' : 'posts'} at the top`
              }
            </p>
          </div>
        )}
      </div>

      {/* ✅ NEW MOTIVATIONAL BANNER (RESPONSIVE) */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-3 sm:p-5 border-2 border-dashed border-indigo-200">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 sm:gap-4">
          <div className="flex-shrink-0 text-2xl sm:text-4xl">
            💡
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 mb-1 text-sm sm:text-base md:text-lg">
              Why Should You Post?
            </h3>
            <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
              Every post you share <span className="font-semibold text-indigo-600">showcases your style</span> and 
              <span className="font-semibold text-purple-600"> helps someone make a better purchase decision</span>. 
              Think of it as giving back to the student community—and looking cool while doing it! 😎
            </p>
          </div>
          {mounted && isAuthenticated && (
            <button
              onClick={() => setShowAddPostModal(true)}
              className="flex-shrink-0 w-full md:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-indigo-600 font-bold rounded-lg border-2 border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all hover:scale-105 text-xs sm:text-sm md:text-base text-center"
            >
              I'm In! 🚀
            </button>
          )}
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                <div className={`absolute -top-2 -left-2 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-lg z-10 ${
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

      {/* Loading More Indicator */}
      {isLoadingMore && hasMore && (
        <div className="flex justify-center items-center py-6 sm:py-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <svg className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600 font-medium text-sm sm:text-base">Loading more posts...</p>
          </div>
        </div>
      )}

      {/* ✅ UPDATED LOAD MORE BUTTON (RESPONSIVE) */}
      {hasMore && !isLoadingMore && (
        <div className="flex flex-col items-center gap-3 sm:gap-4 mt-8 sm:mt-12 mb-6 sm:mb-8">
          <p className="text-xs sm:text-sm text-gray-600 font-medium">
            👇 More awesome student posts below
          </p>
          <button
            onClick={() => {
              setIsLoadingMore(true);
              fetchPosts(currentPage + 1, sortBy).finally(() => setIsLoadingMore(false));
            }}
            disabled={loading}
            className={`px-8 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 ${
              loading 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 hover:-translate-y-1'
            }`}
          >
            <span className="flex items-center gap-2">
              Show Me More Posts
              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          
          <p className="text-xs sm:text-sm text-gray-500">
            Page {currentPage} of {totalPages} • {posts.length} posts loaded
          </p>
        </div>
      )}

      {/* ✅ UPDATED END OF POSTS MESSAGE (RESPONSIVE) */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 sm:py-12 border-t border-gray-200">
          <div className="max-w-lg mx-auto px-4">
            <p className="text-3xl sm:text-4xl mb-2 sm:mb-3">🎉</p>
            <p className="text-lg sm:text-xl font-bold text-gray-800 mb-1.5 sm:mb-2">
              You've Seen Everything!
            </p>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              That's all {posts.length} student posts. Awesome, right?
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6">
              💡 Want to see YOUR post here? Share what you own and help the community!
            </p>
            {mounted && isAuthenticated && (
              <button
                onClick={() => setShowAddPostModal(true)}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold hover:shadow-lg transition-all hover:scale-105 inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
              >
                <span>✨ Add Your Post Now</span>
              </button>
            )}
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
          <div className="flex items-center justify-center gap-2 py-3 sm:py-4">
            <Link 
              href="/"
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              🏠 Products
            </Link>
            <Link 
              href="/posts"
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold text-xs sm:text-sm md:text-base transition-all duration-200 bg-indigo-600 text-white shadow-md"
            >
              📝 Posts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <PostsProvider>
          <Suspense fallback={
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm sm:text-base">Loading awesome posts...</p>
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
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3 sm:p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 group"
          aria-label="Scroll to top"
        >
          <svg 
            className="w-5 h-5 sm:w-6 sm:h-6 transform group-hover:-translate-y-0.5 transition-transform" 
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
