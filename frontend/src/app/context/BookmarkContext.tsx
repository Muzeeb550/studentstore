'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BookmarkContextType {
  bookmarkedSkills: Record<number, boolean>;
  bookmarkCount: number;
  addBookmark: (skillId: number) => Promise<void>;
  removeBookmark: (skillId: number) => Promise<void>;
  refreshBookmarks: () => Promise<void>;
  checkBookmarks: (skillIds: number[]) => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarkedSkills, setBookmarkedSkills] = useState<Record<number, boolean>>({});
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBookmarkCount();
    }
  }, [user]);

  const fetchBookmarkCount = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/skillstore/bookmarks/count`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.status === 'success') {
        setBookmarkCount(result.data.count);
      }
    } catch (error) {
      console.error('Fetch bookmark count error:', error);
    }
  };

  const checkBookmarks = async (skillIds: number[]) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/skillstore/bookmarks/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill_ids: skillIds })
      });

      const result = await response.json();
      if (result.status === 'success') {
        setBookmarkedSkills(result.data);
      }
    } catch (error) {
      console.error('Check bookmarks error:', error);
    }
  };

  const addBookmark = async (skillId: number) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        alert('Please login to bookmark skills');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/skillstore/bookmarks/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill_id: skillId })
      });

      const result = await response.json();
      if (result.status === 'success') {
        // Update state immediately (optimistic update)
        setBookmarkedSkills(prev => ({
          ...prev,
          [skillId]: true
        }));
        setBookmarkCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Add bookmark error:', error);
    }
  };

  const removeBookmark = async (skillId: number) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/skillstore/bookmarks/remove/${skillId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.status === 'success') {
        // Update state immediately (optimistic update)
        setBookmarkedSkills(prev => ({
          ...prev,
          [skillId]: false
        }));
        setBookmarkCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Remove bookmark error:', error);
    }
  };

  const refreshBookmarks = async () => {
    await fetchBookmarkCount();
  };

  return (
    <BookmarkContext.Provider value={{
      bookmarkedSkills,
      bookmarkCount,
      addBookmark,
      removeBookmark,
      refreshBookmarks,
      checkBookmarks
    }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}
