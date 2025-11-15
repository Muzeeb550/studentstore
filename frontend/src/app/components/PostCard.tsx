'use client';

import React, { memo, useState, useEffect, useRef } from 'react';
import { usePosts } from '../context/PostsContext';
import Link from 'next/link';

interface Post {
  id: number;
  username: string;
  user_email: string;
  product_name: string;
  product_review: string;
  product_images: string[];
  product_price: string;
  buy_link: string;
  buy_button_text: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  user_reaction: 'like' | 'dislike' | null;
  admin_name?: string;
  updated_at?: string;
}

interface UserProfile {
  user_id?: number;
  display_name: string;
  profile_picture: string | null;
  exists: boolean;
  member_since?: string;
}

const profileCache: Record<string, UserProfile> = {};

function useUserProfile(email: string, fallbackUsername: string): [UserProfile | null, boolean] {
  const [profile, setProfile] = useState<UserProfile | null>(() => profileCache[email] || null);
  const [loading, setLoading] = useState(!profile);

  useEffect(() => {
    if (!email) {
      setProfile({ display_name: fallbackUsername, profile_picture: null, exists: false });
      setLoading(false);
      return;
    }

    if (profileCache[email]) {
      setProfile(profileCache[email]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchProfile() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/profile-by-email/${encodeURIComponent(email)}`);
        const result = await response.json();
        if (isMounted) {
          if (result.status === 'success') {
            profileCache[email] = result.data;
            setProfile(result.data);
          } else {
            const fallback = { display_name: fallbackUsername, profile_picture: null, exists: false };
            profileCache[email] = fallback;
            setProfile(fallback);
          }
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          const fallback = { display_name: fallbackUsername, profile_picture: null, exists: false };
          profileCache[email] = fallback;
          setProfile(fallback);
          setLoading(false);
        }
      }
    }
    fetchProfile();

    return () => { isMounted = false; };
  }, [email, fallbackUsername]);

  return [profile, loading];
}

const PostCard = memo(({ post }: { post: Post }) => {
  const { reactToPost } = usePosts();
  const [userProfile, loadingProfile] = useUserProfile(post.user_email, post.username);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [reactionDisabled, setReactionDisabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxPosition, setLightboxPosition] = useState({ x: 0, y: 0 });
  
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialZoom, setInitialZoom] = useState(1);
  
  const imageRef = useRef<HTMLDivElement>(null);

  const handleReaction = async (reactionType: 'like' | 'dislike') => {
    if (reactionDisabled) return;
    const token = localStorage.getItem('studentstore_token');
    if (!token) {
      alert('Please sign in to react to posts');
      return;
    }
    setReactionDisabled(true);
    try {
      await reactToPost(post.id, reactionType);
    } catch (e) {
      // Handle error
    } finally {
      setTimeout(() => setReactionDisabled(false), 1000);
    }
  };

  const displayName = userProfile?.display_name || post.username;
  const profilePicture = userProfile?.profile_picture;
  const userId = userProfile?.user_id;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev === post.product_images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? post.product_images.length - 1 : prev - 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = Math.abs(touchStart.y - touchEnd.y);
    
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
  };

  // ✅ UPDATED: Save both scroll position AND post ID
  const handleProfileClick = () => {
    sessionStorage.setItem('postsScrollPosition', window.scrollY.toString());
    sessionStorage.setItem('lastViewedPostId', post.id.toString());
  };

  const openLightbox = (index: number) => {
    setLightboxImageIndex(index);
    setLightboxOpen(true);
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
    
    const scrollY = window.scrollY;
    sessionStorage.setItem('scrollY', scrollY.toString());
    
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    window.history.pushState({ lightboxOpen: true }, '');
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
    
    const scrollY = sessionStorage.getItem('scrollY') || '0';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    
    window.scrollTo(0, parseInt(scrollY));
    sessionStorage.removeItem('scrollY');
  };

  const nextLightboxImage = () => {
    setLightboxImageIndex(prev => (prev === post.product_images.length - 1 ? 0 : prev + 1));
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
  };

  const prevLightboxImage = () => {
    setLightboxImageIndex(prev => (prev === 0 ? post.product_images.length - 1 : prev - 1));
    setLightboxZoom(1);
    setLightboxPosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setLightboxZoom(prev => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setLightboxZoom(prev => Math.max(prev - 0.5, 1));
    if (lightboxZoom <= 1.5) {
      setLightboxPosition({ x: 0, y: 0 });
    }
  };

  const handleLightboxTap = (e: React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      if (lightboxZoom === 1) {
        setLightboxZoom(2);
      } else {
        setLightboxZoom(1);
        setLightboxPosition({ x: 0, y: 0 });
      }
    }
    setLastTap(now);
  };

  const getPinchDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setInitialPinchDistance(getPinchDistance(e.touches));
      setInitialZoom(lightboxZoom);
    } else if (e.touches.length === 1) {
      setTouchStart({
        x: e.touches[0].clientX - lightboxPosition.x,
        y: e.touches[0].clientY - lightboxPosition.y
      });
    }
  };

  const handleLightboxTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const currentDistance = getPinchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.min(Math.max(initialZoom * scale, 1), 3);
      setLightboxZoom(newZoom);
    } else if (e.touches.length === 1 && lightboxZoom > 1) {
      const newX = e.touches[0].clientX - touchStart.x;
      const newY = e.touches[0].clientY - touchStart.y;
      setLightboxPosition({ x: newX, y: newY });
    }
  };

  const handleLightboxTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0 && lightboxZoom === 1) {
      setLightboxPosition({ x: 0, y: 0 });
    }
  };

  const handleLightboxSwipe = (e: React.TouchEvent) => {
    if (lightboxZoom > 1) return;
    
    const deltaX = touchStart.x - e.changedTouches[0].clientX;
    
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        nextLightboxImage();
      } else {
        prevLightboxImage();
      }
    }
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (lightboxOpen) {
        e.preventDefault();
        closeLightbox();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'Escape') {
        closeLightbox();
        if (window.history.state?.lightboxOpen) {
          window.history.back();
        }
      }
      if (e.key === 'ArrowLeft') prevLightboxImage();
      if (e.key === 'ArrowRight') nextLightboxImage();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lightboxOpen]);

  useEffect(() => {
    return () => {
      if (lightboxOpen) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
      }
    };
  }, []);

  const isLongReview = post.product_review.length > 150;

  const UserHeader = () => {
    const content = (
      <>
        {loadingProfile ? (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-300 animate-pulse"></div>
        ) : profilePicture && !imageError ? (
          <img 
            src={profilePicture} 
            alt={displayName}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-indigo-500 shadow-md"
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-md">
            {getInitials(displayName)}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate text-sm sm:text-base">{displayName}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {new Date(post.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
            {userProfile?.exists && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </>
    );

    if (userId && userProfile?.exists) {
      return (
        <Link 
          href={`/profile/${userId}`}
          onClick={handleProfileClick}
          className="p-3 sm:p-4 border-b border-gray-200 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 hover:from-purple-100 hover:via-blue-100 hover:to-purple-100 transition-all cursor-pointer group"
        >
          {content}
          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      );
    }

    return (
      <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50">
        {content}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 flex flex-col relative">
        <div className="flex-shrink-0 relative z-10">
          <UserHeader />
        </div>

        {post.product_images && post.product_images.length > 0 && (
          <div 
            ref={imageRef}
            className="relative bg-gray-100 aspect-square cursor-pointer group select-none" 
            onClick={() => !isExpanded && openLightbox(currentImageIndex)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-y pinch-zoom' }}
          >
            <img 
              src={post.product_images[currentImageIndex]} 
              alt={post.product_name}
              className="w-full h-full object-cover pointer-events-none"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            
            <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-black/60 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 sm:gap-2 z-10">
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
            
            {post.product_images.length > 1 && !isExpanded && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
                  aria-label="Previous image"
                >
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
                  aria-label="Next image"
                >
                  <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                <div className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5 z-10">
                  {post.product_images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                      className={`h-1 sm:h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex 
                          ? 'bg-white w-4 sm:w-6' 
                          : 'bg-white/50 hover:bg-white/75 w-1 sm:w-1.5'
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {isExpanded && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-20 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6 animate-fadeIn">
                <div className="max-w-2xl mx-auto">
                  <p className="text-white text-xs sm:text-sm leading-relaxed">
                    {post.product_review}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                    className="mt-3 sm:mt-4 text-white/80 hover:text-white text-xs sm:text-sm font-medium flex items-center gap-1 transition-colors"
                  >
                    Show less
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-gray-200">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              disabled={reactionDisabled}
              onClick={() => handleReaction('like')}
              className={`flex items-center gap-1 sm:gap-1.5 transition-all ${
                post.user_reaction === 'like'
                  ? 'text-green-600'
                  : 'text-gray-700 hover:text-green-600'
              }`}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={post.user_reaction === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold">{post.likes_count}</span>
            </button>
            
            <button
              disabled={reactionDisabled}
              onClick={() => handleReaction('dislike')}
              className={`flex items-center gap-1 sm:gap-1.5 transition-all ${
                post.user_reaction === 'dislike'
                  ? 'text-red-600'
                  : 'text-gray-700 hover:text-red-600'
              }`}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill={post.user_reaction === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-xs sm:text-sm font-semibold">{post.dislikes_count}</span>
            </button>
          </div>
        </div>

        <div className="flex-shrink-0 px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3">
          <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2">
            {post.product_name}
          </h2>
          
          <div className="mb-2 sm:mb-3">
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed line-clamp-2">
              {post.product_review}
            </p>
            
            {isLongReview && !isExpanded && (
              <button
                onClick={() => setIsExpanded(true)}
                className="mt-0.5 sm:mt-1 text-gray-500 hover:text-gray-700 text-xs sm:text-sm font-medium transition-colors"
              >
                Show more
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500 font-medium mb-0.5">Price</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-indigo-600">
                ₹{parseFloat(post.product_price).toLocaleString('en-IN')}
              </div>
            </div>
            <a
              href={post.buy_link}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105 text-xs sm:text-sm md:text-base whitespace-nowrap flex-shrink-0"
            >
              {post.buy_button_text || 'Buy Now'} →
            </a>
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeLightbox();
              if (window.history.state?.lightboxOpen) {
                window.history.back();
              }
            }
          }}
        >
          <button
            onClick={() => {
              closeLightbox();
              if (window.history.state?.lightboxOpen) {
                window.history.back();
              }
            }}
            className="absolute top-2 sm:top-4 right-2 sm:right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3 transition-all z-20"
            aria-label="Close lightbox"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex gap-1.5 sm:gap-2 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); zoomOut(); }}
              className="text-white bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3 transition-all"
              aria-label="Zoom out"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); zoomIn(); }}
              className="text-white bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3 transition-all"
              aria-label="Zoom in"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
            <div className="text-white bg-black/50 rounded-full px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-3 font-medium text-xs sm:text-sm md:text-base">
              {Math.round(lightboxZoom * 100)}%
            </div>
          </div>

          <div 
            className="relative w-full h-full flex items-center justify-center overflow-hidden" 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeLightbox();
                if (window.history.state?.lightboxOpen) {
                  window.history.back();
                }
              }
            }}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={(e) => {
              handleLightboxTouchEnd(e);
              handleLightboxTap(e);
              if (e.changedTouches.length === 1) {
                handleLightboxSwipe(e);
              }
            }}
            style={{ touchAction: 'none' }}
          >
            <img
              src={post.product_images[lightboxImageIndex]}
              alt={post.product_name}
              className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
              style={{ 
                transform: `scale(${lightboxZoom}) translate(${lightboxPosition.x / lightboxZoom}px, ${lightboxPosition.y / lightboxZoom}px)`,
                cursor: lightboxZoom > 1 ? 'move' : 'default',
                pointerEvents: 'none'
              }}
              draggable={false}
            />
          </div>

          {lightboxZoom === 1 && (
            <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-xs sm:text-sm text-center z-10 pointer-events-none">
              <p className="hidden sm:block">Swipe • Zoom • Click to close</p>
              <p className="sm:hidden">Swipe • Zoom • Tap to close</p>
            </div>
          )}

          {post.product_images.length > 1 && lightboxZoom === 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevLightboxImage(); }}
                className="absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3 md:p-4 transition-all z-20"
                aria-label="Previous image"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={(e) => { e.stopPropagation(); nextLightboxImage(); }}
                className="absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 sm:p-3 md:p-4 transition-all z-20"
                aria-label="Next image"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 text-white bg-black/50 px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full font-medium text-xs sm:text-sm md:text-base pointer-events-none">
                {lightboxImageIndex + 1} / {post.product_images.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
