'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useBookmarks } from '../../context/BookmarkContext';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface SkillData {
  skill: {
    id: number;
    name: string;
    card_image_url: string;
  };
  details: {
    description: string;
    roadmap_image_url: string;
    opportunities_image_url: string;
  };
  free_resources: Array<{
    id: number;
    resource_number: number;
    image_url: string;
    link_url: string;
  }>;
  paid_resources: Array<{
    id: number;
    resource_number: number;
    image_url: string;
    link_url: string;
  }>;
}

export default function SkillDetailsPage() {
  const params = useParams();
  const skillId = parseInt(params.skillId as string);

  const [data, setData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  // ✅ NEW: Lightbox state for roadmap and opportunities
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<'roadmap' | 'opportunities' | null>(null);

  const hasCheckedBookmarkRef = useRef(false);
  const { bookmarkedSkills, addBookmark, removeBookmark, checkBookmarks } = useBookmarks();

  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    
    fetchSkillDetails();
  }, [skillId]);

  useEffect(() => {
    if (user && !hasCheckedBookmarkRef.current) {
      checkBookmarks([skillId]);
      hasCheckedBookmarkRef.current = true;
    }
  }, [user, skillId, checkBookmarks]);

  // ✅ NEW: Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  // ✅ NEW: Scroll lock for lightbox
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLightboxOpen]);

  // ✅ FIX: Removed backtick escaping - use proper template literals
  const fetchSkillDetails = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const url = `${apiUrl}/api/skillstore/skills/${skillId}`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Skill not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async () => {
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

  // ✅ NEW: Lightbox handlers - properly defined before use
  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setLightboxImage(null);
  };

  const openLightbox = (imageType: 'roadmap' | 'opportunities') => {
    setLightboxImage(imageType);
    setIsLightboxOpen(true);
  };

  // ✅ NEW: Share image function
  const handleShareImage = async (imageType: 'roadmap' | 'opportunities') => {
    const imageUrl = imageType === 'roadmap' 
      ? data?.details.roadmap_image_url 
      : data?.details.opportunities_image_url;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${data?.skill.name} - ${imageType === 'roadmap' ? 'Learning Roadmap' : 'Career Opportunities'}`,
          text: `Check out this ${imageType === 'roadmap' ? 'learning roadmap' : 'career opportunities'} for ${data?.skill.name} on SkillStore`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/skillstore" className="text-purple-600 hover:text-purple-700">
            ← Back to SkillStore
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const currentImage = lightboxImage === 'roadmap' 
    ? data.details.roadmap_image_url 
    : data.details.opportunities_image_url;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/skillstore" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Back to SkillStore
        </Link>
        
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{data.skill.name}</h1>
          </div>
          
          <button
            onClick={handleBookmark}
            className={`p-3 rounded-lg transition-all ${
              bookmarkedSkills[skillId]
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-red-500 hover:text-white'
            }`}
          >
            <svg className="w-6 h-6" fill={bookmarkedSkills[skillId] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Skill</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{data.details.description}</p>
      </div>

      {/* ✅ NEW: Roadmap Section with Zoom */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Learning Roadmap</h2>
        <p className="text-gray-600 mb-4">Here's what you'll learn step by step:</p>
        
        <div 
          className="relative group cursor-zoom-in rounded-lg overflow-hidden"
          onClick={() => openLightbox('roadmap')}
        >
          <img 
            src={data.details.roadmap_image_url}
            alt="Learning Roadmap"
            className="w-full rounded-lg border transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
            }}
          />
          
          {/* ✅ NEW: Zoom Indicator Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-black/60 text-white px-4 py-2 rounded-full flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              <span className="text-sm font-medium">Click to zoom</span>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Opportunities Section with Zoom */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💼 Career Opportunities</h2>
        <p className="text-gray-600 mb-4">See the career paths and job opportunities available with this skill:</p>
        
        <div 
          className="relative group cursor-zoom-in rounded-lg overflow-hidden"
          onClick={() => openLightbox('opportunities')}
        >
          <img 
            src={data.details.opportunities_image_url}
            alt="Career Opportunities"
            className="w-full rounded-lg border transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="16" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
            }}
          />
          
          {/* ✅ NEW: Zoom Indicator Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-black/60 text-white px-4 py-2 rounded-full flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              <span className="text-sm font-medium">Click to zoom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resources Button */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📖 Learning Resources</h2>
        <p className="text-gray-600 mb-6">Access free tutorials and paid courses to master this skill:</p>
        
        <Link
          href={`/skillstore/${skillId}/resources`}
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          View Resources →
        </Link>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
        <p className="mb-6">Check out the resources and choose your learning path</p>
        <button
          onClick={handleBookmark}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            bookmarkedSkills[skillId]
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white text-purple-600 hover:bg-gray-100'
          }`}
        >
          {bookmarkedSkills[skillId] ? '✓ Skill Bookmarked' : '+ Bookmark This Skill'}
        </button>
      </div>

      {/* Footer Link */}
      <div className="text-center mb-8">
        <Link 
          href="/skillstore"
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Explore More Skills
        </Link>
      </div>

      {/* ✅ NEW: Image Lightbox with Zoom Support */}
      {isLightboxOpen && currentImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-50"
            title="Close (ESC)"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShareImage(lightboxImage!);
            }}
            className="absolute top-4 right-16 text-white hover:text-gray-300 transition-colors z-50"
            title="Share"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
          
          {/* Image Label */}
          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium z-50">
            {lightboxImage === 'roadmap' ? '📚 Learning Roadmap' : '💼 Career Opportunities'}
          </div>
          
          {/* Zoomable Image Container */}
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <TransformWrapper
              initialScale={1}
              minScale={1}
              maxScale={4}
              doubleClick={{
                mode: "toggle",
                step: 0.7
              }}
              wheel={{
                step: 0.2
              }}
              pinch={{
                step: 5
              }}
              panning={{
                velocityDisabled: true
              }}
            >
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                  maxWidth: "90vw",
                  maxHeight: "90vh"
                }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <img
                  src={currentImage}
                  alt={lightboxImage === 'roadmap' ? 'Learning Roadmap' : 'Career Opportunities'}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "90vh",
                    objectFit: "contain",
                    borderRadius: "8px"
                  }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23374151" width="400" height="300"/%3E%3C/svg%3E';
                  }}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
          
          {/* Instructions */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium z-50">
            <span className="hidden md:inline">Double-click to zoom | Scroll wheel | Drag to pan | ESC to close</span>
            <span className="md:hidden">🤏 Pinch zoom | 👆 Double-tap | Drag pan | Tap X to close</span>
          </div>
        </div>
      )}
    </div>
  );
}
