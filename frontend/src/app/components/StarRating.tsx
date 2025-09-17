'use client';

import { useState, useEffect } from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showRatingText?: boolean;
  className?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showRatingText = false,
  className = ''
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(rating);

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const handleStarClick = (starRating: number) => {
    if (!interactive) return;
    
    setCurrentRating(starRating);
    if (onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating: number) => {
    if (!interactive) return;
    setHoverRating(starRating);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
  };

  const getStarColor = (starIndex: number) => {
    const ratingToCheck = interactive && hoverRating > 0 ? hoverRating : currentRating;
    
    if (starIndex <= ratingToCheck) {
      return 'text-yellow-400 fill-yellow-400';
    } else if (starIndex - 0.5 <= ratingToCheck) {
      // Half star - we'll use a gradient or special handling later if needed
      return 'text-yellow-400 fill-yellow-400';
    } else {
      return 'text-gray-300 fill-gray-300';
    }
  };

  const getRatingText = () => {
    if (interactive && hoverRating > 0) {
      const ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
      return ratingTexts[hoverRating] || '';
    }
    if (currentRating === 0) return 'No rating';
    return `${currentRating.toFixed(1)} out of ${maxRating}`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Stars */}
      <div 
        className="flex items-center space-x-1"
        onMouseLeave={handleMouseLeave}
      >
        {[...Array(maxRating)].map((_, index) => {
          const starIndex = index + 1;
          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              className={`${getSizeClasses()} transition-all duration-200 ${
                interactive 
                  ? 'cursor-pointer hover:scale-110 transform' 
                  : 'cursor-default'
              } ${getStarColor(starIndex)}`}
              onClick={() => handleStarClick(starIndex)}
              onMouseEnter={() => handleStarHover(starIndex)}
            >
              <svg
                className="w-full h-full"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Rating Text */}
      {showRatingText && (
        <span className={`ml-2 ${getTextSize()} text-gray-600 font-medium`}>
          {getRatingText()}
        </span>
      )}

      {/* Interactive helper text */}
      {interactive && (
        <span className={`ml-3 ${getTextSize()} text-gray-500 italic`}>
          {hoverRating > 0 ? 'Click to rate' : 'Hover to preview'}
        </span>
      )}
    </div>
  );
}
