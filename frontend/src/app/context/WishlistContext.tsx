'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface WishlistContextType {
  wishlistItems: Set<number>;
  wishlistCount: number;
  isInWishlist: (productId: number) => boolean;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  checkMultipleProducts: (productIds: number[]) => Promise<void>;
  refreshWishlistCount: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<Set<number>>(new Set());
  const [wishlistCount, setWishlistCount] = useState(0);

  // Check if a single product is in wishlist
  const isInWishlist = useCallback((productId: number) => {
    return wishlistItems.has(productId);
  }, [wishlistItems]);

  // ✅ BATCH CHECK - Check multiple products at once (ONE API CALL!)
  const checkMultipleProducts = useCallback(async (productIds: number[]) => {
    if (productIds.length === 0) return;

    const token = localStorage.getItem('studentstore_token');
    if (!token) {
      setWishlistItems(new Set()); // Clear if not logged in
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/wishlist/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_ids: productIds })
      });

      const result = await response.json();
      if (result.status === 'success') {
        // Convert result to Set of product IDs that are in wishlist
        const newWishlistItems = new Set<number>();
        Object.keys(result.data).forEach((productId) => {
          if (result.data[productId] === true) {
            newWishlistItems.add(parseInt(productId, 10));
          }
        });
        setWishlistItems(newWishlistItems);
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  }, []);

  // Refresh wishlist count
  const refreshWishlistCount = useCallback(async () => {
    const token = localStorage.getItem('studentstore_token');
    if (!token) {
      setWishlistCount(0);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/wishlist/count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();
      if (result.status === 'success') {
        setWishlistCount(result.data.count);
      }
    } catch (error) {
      console.error('Error fetching wishlist count:', error);
    }
  }, []);

  // Add product to wishlist
  const addToWishlist = useCallback(async (productId: number) => {
    const token = localStorage.getItem('studentstore_token');
    if (!token) throw new Error('Not authenticated');

    try {
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
        // Update local state
        setWishlistItems(prev => new Set(prev).add(productId));
        setWishlistCount(prev => prev + 1);
        
        // Dispatch event for navbar
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      throw error;
    }
  }, []);

  // Remove product from wishlist
  const removeFromWishlist = useCallback(async (productId: number) => {
    const token = localStorage.getItem('studentstore_token');
    if (!token) throw new Error('Not authenticated');

    try {
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
        // Update local state
        setWishlistItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        setWishlistCount(prev => Math.max(0, prev - 1));
        
        // Dispatch event for navbar
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      throw error;
    }
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        checkMultipleProducts,
        refreshWishlistCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within WishlistProvider');
  }
  return context;
}
