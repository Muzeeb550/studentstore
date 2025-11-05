'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useBookmarks } from '../context/BookmarkContext';

interface Banner {
  id: number;
  image_url: string;
  display_order: number;
  redirect_type: string;
  redirect_skill_id: number | null;
  redirect_custom_url: string | null;
  skill_name: string | null;
}

interface Skill {
  id: number;
  name: string;
  card_image_url: string;
  has_details: boolean;
  bookmark_count: string;
}

export default function SkillStorePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [timerKey, setTimerKey] = useState(0);
  const [user, setUser] = useState<any>(null);

  // Touch/Swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const SWIPE_THRESHOLD = 50;
  const BANNER_INTERVAL = 6000;

  const { bookmarkedSkills, addBookmark, removeBookmark, checkBookmarks } = useBookmarks();

  // ✅ Initialize user on mount
  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  // ✅ NEW: Fetch data with cache-busting
  const fetchData = async () => {
  try {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    console.log('🔄 Fetching from:', apiUrl);
    
    // ✅ SIMPLIFIED: Remove complex headers, just use query param
    const [bannersRes, skillsRes] = await Promise.all([
      fetch(`${apiUrl}/api/skillstore/banners?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'omit' // ✅ Don't send cookies
      }),
      fetch(`${apiUrl}/api/skillstore/skills?t=${Date.now()}`, {
        method: 'GET',
        credentials: 'omit' // ✅ Don't send cookies
      })
    ]);

    console.log('✅ Banners Response Status:', bannersRes.status);
    console.log('✅ Skills Response Status:', skillsRes.status);

    if (!bannersRes.ok) {
      console.error('❌ Banners fetch failed:', bannersRes.statusText);
    }
    if (!skillsRes.ok) {
      console.error('❌ Skills fetch failed:', skillsRes.statusText);
    }

    const bannersResult = await bannersRes.json();
    const skillsResult = await skillsRes.json();

    console.log('📊 Banners:', bannersResult);
    console.log('📊 Skills:', skillsResult);

    if (bannersResult.status === 'success') {
      setBanners(bannersResult.data);
    }

    if (skillsResult.status === 'success') {
      setSkills(skillsResult.data);
      
      if (user) {
        checkBookmarks(skillsResult.data.map((s: Skill) => s.id));
      }
    }
  } catch (error) {
    console.error('❌ Fetch error:', error);
    setLoading(false);
  } finally {
    setLoading(false);
  }
};

  // ✅ NEW: Initial fetch on mount
  useEffect(() => {
    fetchData();
  }, [user]);

  // ✅ NEW: Auto-refresh every 30 seconds to sync with cache TTL
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Refreshing skillstore data...');
      fetchData();
    }, 30000); // 30 seconds = same as cache TTL

    return () => clearInterval(interval);
  }, [user]);

  // ✅ NEW: Listen for manual refresh event
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Manual refresh triggered');
      fetchData();
    };

    window.addEventListener('skillstore:refresh', handleRefresh);
    return () => window.removeEventListener('skillstore:refresh', handleRefresh);
  }, [user]);

  // Auto-slide banner every 6 seconds
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, BANNER_INTERVAL);

    return () => clearInterval(interval);
  }, [banners.length, timerKey]);

  const handleBannerClick = (banner: Banner) => {
    if (banner.redirect_type === 'skill' && banner.redirect_skill_id) {
      window.location.href = `/skillstore/${banner.redirect_skill_id}`;
    } else if (banner.redirect_type === 'custom' && banner.redirect_custom_url) {
      window.open(banner.redirect_custom_url, '_blank');
    }
  };

  const handleDotClick = (index: number) => {
    setCurrentBannerIndex(index);
    setTimerKey((prev) => prev + 1);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;

    if (swipeDistance > SWIPE_THRESHOLD) {
      const nextIndex = (currentBannerIndex + 1) % banners.length;
      setCurrentBannerIndex(nextIndex);
      setTimerKey((prev) => prev + 1);
      console.log('🔄 Swiped LEFT → Next banner');
    }

    if (swipeDistance < -SWIPE_THRESHOLD) {
      const prevIndex = (currentBannerIndex - 1 + banners.length) % banners.length;
      setCurrentBannerIndex(prevIndex);
      setTimerKey((prev) => prev + 1);
      console.log('🔄 Swiped RIGHT → Previous banner');
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Banners Carousel */}
      {banners.length > 0 && (
        <div className="mb-8">
          <div 
            className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden cursor-pointer group select-none"
            onClick={() => handleBannerClick(banners[currentBannerIndex])}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{
              touchAction: 'pan-y',
            }}
          >
            <img
              src={banners[currentBannerIndex].image_url}
              alt={`Banner ${currentBannerIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              key={currentBannerIndex}
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {banners.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDotClick(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentBannerIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to banner ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Skill Store</h1>
        <p className="text-gray-600 mt-2">Master new skills and unlock career opportunities</p>
      </div>

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No skills available yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div 
              key={skill.id} 
              className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-100 relative overflow-hidden group">
                <img
                  src={skill.card_image_url}
                  alt={skill.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                  }}
                />
                
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

                {!skill.has_details && (
                  <div className="absolute bottom-3 right-3 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    Coming Soon
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{skill.name}</h3>
                
                {skill.has_details ? (
                  <Link
                    href={`/skillstore/${skill.id}`}
                    className="block w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-center font-medium transition-colors"
                  >
                    Learn More
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
      )}
    </div>
  );
}
