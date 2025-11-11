'use client';

import { useState } from 'react';

interface UserPost {
  id: number;
  product_name: string;
  product_review: string;
  product_images: string;
  product_price: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
}

interface PublicProfilePostCardProps {
  post: UserPost;
}

export default function PublicProfilePostCard({ post }: PublicProfilePostCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [userReaction, setUserReaction] = useState<'like' | 'dislike' | null>(null);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [dislikesCount, setDislikesCount] = useState(post.dislikes_count);
  const [reacting, setReacting] = useState(false);

  // Parse images
  const parseImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  const images = parseImages(post.product_images);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const nextImage = () => {
    setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = () => {
    setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleReaction = async (reactionType: 'like' | 'dislike') => {
    if (reacting) return;
    
    const token = localStorage.getItem('studentstore_token');
    if (!token) {
      alert('Please sign in to react to posts');
      return;
    }

    setReacting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/posts/${post.id}/reaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reactionType }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        const action = result.data.action;

        if (action === 'removed') {
          // Reaction removed
          setUserReaction(null);
          if (reactionType === 'like') {
            setLikesCount(prev => Math.max(0, prev - 1));
          } else {
            setDislikesCount(prev => Math.max(0, prev - 1));
          }
        } else if (action === 'updated') {
          // Changed reaction
          setUserReaction(reactionType);
          if (reactionType === 'like') {
            setLikesCount(prev => prev + 1);
            setDislikesCount(prev => Math.max(0, prev - 1));
          } else {
            setDislikesCount(prev => prev + 1);
            setLikesCount(prev => Math.max(0, prev - 1));
          }
        } else {
          // Added new reaction
          setUserReaction(reactionType);
          if (reactionType === 'like') {
            setLikesCount(prev => prev + 1);
          } else {
            setDislikesCount(prev => prev + 1);
          }
        }
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
      alert('Failed to react. Please try again.');
    } finally {
      setReacting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-border-light overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Product Images Carousel */}
      <div className="relative aspect-square overflow-hidden bg-student-light group">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex]}
              alt={post.product_name}
              className="w-full h-full object-cover"
            />
            
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full w-8 h-8 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex 
                          ? 'bg-white w-6' 
                          : 'bg-white/50 hover:bg-white/75'
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">
            📦
          </div>
        )}
      </div>

      {/* Post Info */}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-student-primary text-sm sm:text-base mb-2 line-clamp-2">
          {post.product_name}
        </h3>
        
        <p className="text-xs sm:text-sm text-student-secondary line-clamp-2 mb-3">
          {post.product_review}
        </p>

        {/* Price & Reactions Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-indigo-600">
            ₹{parseFloat(post.product_price).toFixed(0)}
          </div>
          
          {/* Reaction Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleReaction('like')}
              disabled={reacting}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium ${
                userReaction === 'like'
                  ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600'
              } ${reacting ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Like post"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.641 1.038-1.09 1.408-.558.482-1.2.879-1.915 1.164-1.299.518-2.582 1.184-3.736 1.966.35.485.611 1.026.76 1.604.149.579.195 1.185.14 1.785-.13 1.434-.65 2.768-1.5 3.846a4.488 4.488 0 01-3.393 1.536z" />
              </svg>
              <span>{likesCount}</span>
            </button>
            
            <button
              onClick={() => handleReaction('dislike')}
              disabled={reacting}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all text-xs font-medium ${
                userReaction === 'dislike'
                  ? 'bg-red-100 text-red-700 ring-2 ring-red-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
              } ${reacting ? 'opacity-50 cursor-not-allowed' : ''}`}
              aria-label="Dislike post"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558.641-1.038 1.09-1.408.558-.482 1.2-.879 1.915-1.164 1.299-.518 2.582-1.184 3.736-1.966-.35-.485-.611-1.026-.76-1.604-.149-.579-.195-1.185-.14-1.785.13-1.434.65-2.768 1.5-3.846a4.488 4.488 0 013.393-1.536z" />
              </svg>
              <span>{dislikesCount}</span>
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="pt-2 border-t border-border-light">
          <p className="text-xs text-student-secondary">
            Posted {formatDate(post.created_at)}
          </p>
        </div>
      </div>
    </div>
  );
}
