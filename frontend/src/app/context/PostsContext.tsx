'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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

// ✅ UPDATED: Added sortBy and setSortBy
interface PostsContextType {
  posts: Post[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  sortBy: 'hot' | 'new' | 'top'; // ✅ NEW
  setSortBy: (sort: 'hot' | 'new' | 'top') => void; // ✅ NEW
  fetchPosts: (page?: number, sort?: string) => Promise<void>; // ✅ UPDATED
  reactToPost: (postId: number, reactionType: 'like' | 'dislike') => Promise<void>;
  refreshPosts: () => Promise<void>;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot'); // ✅ NEW: Default to 'hot'
  const hasFetched = useRef(false);

  const parseProductImages = useCallback((images: string[] | string): string[] => {
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  // ✅ UPDATED: Accept sort parameter
  const fetchPosts = useCallback(async (page = 1, sort?: string) => {
    if (loading) return;
    
    const currentSort = sort || sortBy; // Use provided sort or current state
    
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('studentstore_token');
      
      const headers: HeadersInit = { 
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // ✅ NEW: Add sort parameter to URL
      const response = await fetch(
        `${apiUrl}/api/posts?page=${page}&limit=20&sort=${currentSort}`, 
        { 
          headers,
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch posts`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        const parsedPosts = result.data.posts.map((post: Post) => ({
          ...post,
          product_images: parseProductImages(post.product_images)
        }));

        // ✅ FIXED: Deduplicate posts to prevent duplicate key errors
        setPosts(prevPosts => {
          if (page === 1) {
            // First page: Replace all posts
            return parsedPosts;
          } else {
            // Subsequent pages: Add only unique posts
            const existingIds = new Set(prevPosts.map(p => p.id));
            const uniqueNewPosts = parsedPosts.filter((post: Post) => !existingIds.has(post.id));
            return [...prevPosts, ...uniqueNewPosts];
          }
        });
        
        setCurrentPage(result.data.pagination.current_page);
        setTotalPages(result.data.pagination.total_pages);
        
        const totalOnScreen = page === 1 ? parsedPosts.length : posts.length + parsedPosts.length;
        console.log(`📝 Loaded ${parsedPosts.length} posts (${currentSort} sort, page ${page}/${result.data.pagination.total_pages}), Total: ${totalOnScreen}`);
      } else {
        setError(result.message || 'Failed to fetch posts');
      }
    } catch (e) {
      const errorMessage = (e as Error).message;
      console.error('Fetch posts error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [parseProductImages, posts.length, sortBy, loading]);

  const reactToPost = useCallback(async (postId: number, reactionType: 'like' | 'dislike') => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('studentstore_token');
      
      if (!token) {
        alert('Please sign in to react to posts');
        return;
      }

      const response = await fetch(`${apiUrl}/api/posts/${postId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reactionType })
      });

      const result = await response.json();

      if (result.status !== 'success') {
        throw new Error(result.message || 'Failed to react to post');
      }

      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          const updatedPost = { ...post };
          const oldReaction = post.user_reaction;

          if (result.data.action === 'added') {
            if (reactionType === 'like') updatedPost.likes_count += 1;
            else updatedPost.dislikes_count += 1;
            updatedPost.user_reaction = reactionType;
          } else if (result.data.action === 'removed') {
            if (reactionType === 'like') updatedPost.likes_count = Math.max(0, updatedPost.likes_count - 1);
            else updatedPost.dislikes_count = Math.max(0, updatedPost.dislikes_count - 1);
            updatedPost.user_reaction = null;
          } else if (result.data.action === 'updated') {
            if (oldReaction === 'like') {
              updatedPost.likes_count = Math.max(0, updatedPost.likes_count - 1);
              updatedPost.dislikes_count += 1;
            } else {
              updatedPost.dislikes_count = Math.max(0, updatedPost.dislikes_count - 1);
              updatedPost.likes_count += 1;
            }
            updatedPost.user_reaction = reactionType;
          }

          return updatedPost;
        }
        return post;
      }));

      console.log(`✅ Post ${postId} reaction ${result.data.action}: ${reactionType}`);

    } catch (error) {
      console.error('React to post error:', error);
      alert((error as Error).message || 'Failed to react to post');
    }
  }, []);

  // ✅ UPDATED: Pass sortBy when refreshing
  const refreshPosts = useCallback(async () => {
    setPosts([]);
    setCurrentPage(1);
    await fetchPosts(1, sortBy);
  }, [fetchPosts, sortBy]);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchPosts(1);
  }, []);

  const hasMore = currentPage < totalPages;

  return (
    <PostsContext.Provider 
      value={{ 
        posts, 
        loading, 
        error, 
        currentPage, 
        totalPages, 
        hasMore,
        sortBy, // ✅ NEW
        setSortBy, // ✅ NEW
        fetchPosts, 
        reactToPost,
        refreshPosts
      }}
    >
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used within PostsProvider');
  }
  return context;
}
