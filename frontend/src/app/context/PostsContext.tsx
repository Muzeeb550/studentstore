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

interface PostsContextType {
  posts: Post[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  fetchPosts: (page?: number) => Promise<void>;
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
  const hasFetched = useRef(false); // ✅ Prevent double fetch

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

  const fetchPosts = useCallback(async (page = 1) => {
    // ✅ Prevent duplicate fetches in development
    if (loading) return;
    
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

      const response = await fetch(`${apiUrl}/api/posts?page=${page}&limit=12`, { 
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch posts`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        const parsedPosts = result.data.posts.map((post: Post) => ({
          ...post,
          product_images: parseProductImages(post.product_images)
        }));

        setPosts(parsedPosts);
        setCurrentPage(result.data.pagination.current_page);
        setTotalPages(result.data.pagination.total_pages);
        
        console.log(`📝 Loaded ${parsedPosts.length} posts (page ${page}/${result.data.pagination.total_pages})`);
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
  }, [parseProductImages]); // ✅ Remove 'loading' from dependencies

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

  const refreshPosts = useCallback(async () => {
    await fetchPosts(currentPage);
  }, [fetchPosts, currentPage]);

  // ✅ Fetch posts only once on mount
  useEffect(() => {
    if (hasFetched.current) return; // Prevent double fetch in dev mode
    hasFetched.current = true;
    fetchPosts(1);
  }, []); // ✅ Empty dependencies - only run once

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
