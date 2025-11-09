'use client';

import React, { memo, useState, useEffect } from 'react';
import { usePosts } from '../context/PostsContext';

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
  display_name: string;
  profile_picture: string | null;
  exists: boolean;
  member_since?: string;
}

// Global in-memory cache for profiles to persist between renders/components
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

  const handleReaction = async (reactionType: 'like' | 'dislike') => {
    if (reactionDisabled) return;  // prevent rapid clicks
    const token = localStorage.getItem('studentstore_token');
    if (!token) {
      alert('Please sign in to react to posts');
      return;
    }
    setReactionDisabled(true);
    try {
      await reactToPost(post.id, reactionType);
    } catch (e) {
      // Optionally handle error feedback here
    } finally {
      setTimeout(() => setReactionDisabled(false), 1000); // 1 second cooldown
    }
  };

  const displayName = userProfile?.display_name || post.username;
  const profilePicture = userProfile?.profile_picture;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev === post.product_images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? post.product_images.length - 1 : prev - 1));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {/* User Info Header */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50">
        {loadingProfile ? (
          <div className="w-12 h-12 rounded-full bg-gray-300 animate-pulse"></div>
        ) : profilePicture && !imageError ? (
          <img 
            src={profilePicture} 
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500 shadow-md"
            onError={() => setImageError(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md">
            {getInitials(displayName)}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{displayName}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">
              {new Date(post.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
            {userProfile?.exists && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                ✓ Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Product Images Carousel */}
      {post.product_images && post.product_images.length > 0 && (
        <div className="relative bg-gray-100 group">
          <img 
            src={post.product_images[currentImageIndex]} 
            alt={post.product_name}
            className="w-full h-72 object-cover"
            loading="lazy"
            decoding="async"
          />
          
          {post.product_images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-lg"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                {post.product_images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === currentImageIndex 
                        ? 'bg-white w-8' 
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="p-5">
        <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {post.product_name}
        </h2>
        <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
          {post.product_review}
        </p>
        
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <div>
            <span className="text-xs text-gray-500 font-medium">Price</span>
            <div className="text-2xl font-bold text-indigo-600">
              ₹{parseFloat(post.product_price).toLocaleString('en-IN')}
            </div>
          </div>
          <a
            href={post.buy_link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
          >
            {post.buy_button_text || 'Buy Now'} →
          </a>
        </div>

        {/* Reactions */}
        <div className="flex items-center gap-3">
          <button
            disabled={reactionDisabled}
            onClick={() => handleReaction('like')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              post.user_reaction === 'like'
                ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600'
            }`}
          >
            <span className="text-xl">👍</span>
            <span>{post.likes_count}</span>
          </button>
          
          <button
            disabled={reactionDisabled}
            onClick={() => handleReaction('dislike')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all font-medium ${
              post.user_reaction === 'dislike'
                ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <span className="text-xl">👎</span>
            <span>{post.dislikes_count}</span>
          </button>
        </div>
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';

export default PostCard;
