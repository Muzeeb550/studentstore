'use client';

import { useState, useEffect } from 'react';
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
  const [user, setUser] = useState<any>(null);

  const { bookmarkedSkills, addBookmark, removeBookmark, checkBookmarks } = useBookmarks();

  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    
    fetchData();
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const [bannersRes, skillsRes] = await Promise.all([
        fetch(`${apiUrl}/api/skillstore/banners`),
        fetch(`${apiUrl}/api/skillstore/skills`)
      ]);

      const bannersResult = await bannersRes.json();
      const skillsResult = await skillsRes.json();

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
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = (banner: Banner) => {
    if (banner.redirect_type === 'skill' && banner.redirect_skill_id) {
      window.location.href = `/skillstore/${banner.redirect_skill_id}`;
    } else if (banner.redirect_type === 'custom' && banner.redirect_custom_url) {
      window.open(banner.redirect_custom_url, '_blank');
    }
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
            className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden cursor-pointer group"
            onClick={() => handleBannerClick(banners[currentBannerIndex])}
          >
            <img
              src={banners[currentBannerIndex].image_url}
              alt={`Banner ${currentBannerIndex + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Banner Navigation Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                {banners.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentBannerIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentBannerIndex 
                        ? 'bg-white w-6' 
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
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
                >
                  <svg className="w-5 h-5" fill={bookmarkedSkills[skill.id] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>

                {/* Status Badge */}
                {!skill.has_details && (
                  <div className="absolute bottom-3 right-3 bg-orange-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    Coming Soon
                  </div>
                )}
              </div>

              {/* Skill Info */}
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
