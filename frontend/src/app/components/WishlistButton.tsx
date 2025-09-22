'use client';

import { useState, useEffect } from 'react';

interface User {
  id: number;
  email: string;
  role: string;
}

interface WishlistButtonProps {
  productId: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onWishlistChange?: (isInWishlist: boolean) => void;
}

export default function WishlistButton({ 
  productId, 
  className = '', 
  size = 'md',
  onWishlistChange 
}: WishlistButtonProps) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        checkWishlistStatus();
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [productId]);

  const checkWishlistStatus = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/wishlist/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_ids: [productId] })
      });

      const result = await response.json();
      if (result.status === 'success') {
        const status = result.data[productId] || false;
        setIsInWishlist(status);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

const handleWishlistToggle = async () => {
    // Check if user is logged in
    if (!user) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (isInWishlist) {
        // Remove from wishlist
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/wishlist/remove/${productId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        const result = await response.json();
        if (result.status === 'success') {
          setIsInWishlist(false);
          if (onWishlistChange) {
            onWishlistChange(false);
          }
          // ✨ ADDED: Dispatch event to update navbar count
          window.dispatchEvent(new CustomEvent('wishlist-updated'));
        } else {
          console.error('Remove from wishlist failed:', result.message);
        }
      } else {
        // Add to wishlist
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/wishlist/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ product_id: productId })
        });

        const result = await response.json();
        if (result.status === 'success') {
          setIsInWishlist(true);
          if (onWishlistChange) {
            onWishlistChange(true);
          }
          // ✨ ADDED: Dispatch event to update navbar count
          window.dispatchEvent(new CustomEvent('wishlist-updated'));
        } else {
          console.error('Add to wishlist failed:', result.message);
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };



const handleLoginRedirect = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  window.location.href = `${apiUrl}/auth/google`;
};

  return (
    <div className="relative">
      <button
        onClick={handleWishlistToggle}
        disabled={isLoading}
        className={`
          ${sizeConfig[size]} 
          ${className}
          bg-white/90 backdrop-blur-sm rounded-full 
          flex items-center justify-center 
          shadow-lg hover:shadow-xl 
          transition-all duration-300 
          hover:scale-110 active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed
          border-2 border-transparent
          ${isInWishlist 
            ? 'hover:bg-red-50 border-red-100' 
            : 'hover:bg-gray-50 border-gray-100'
          }
        `}
        title={
          !user 
            ? 'Sign in to save products' 
            : isInWishlist 
              ? 'Remove from wishlist' 
              : 'Add to wishlist'
        }
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
        ) : (
          <svg 
            className={`
              ${size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}
              transition-all duration-300 transform
              ${isInWishlist 
                ? 'text-red-500 fill-current scale-110' 
                : 'text-gray-600 hover:text-red-500'
              }
            `}
            fill={isInWishlist ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
            />
          </svg>
        )}
      </button>

      {/* Login prompt tooltip */}
      {showLoginPrompt && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
          <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            <p className="mb-1">Sign in to save products</p>
            <button
              onClick={handleLoginRedirect}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Sign in now
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
