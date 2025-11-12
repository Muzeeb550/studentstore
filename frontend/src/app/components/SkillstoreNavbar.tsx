'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBookmarks } from '../context/BookmarkContext';
import SkillstoreSearchBar from './SkillstoreSearchBar';

interface User {
  id: number;
  email: string;
  display_name?: string;
  role?: string;
  profile_picture?: string;
}

export default function SkillstoreNavbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string>('');
  const router = useRouter();
  const { bookmarkCount } = useBookmarks();

  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        
        if (parsedUser.profile_picture) {
          setProfilePicture(parsedUser.profile_picture);
        }
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('studentstore_token');
        if (!token) return;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success') {
            const userData = result.data;
            
            setUser(prev => ({
              ...prev!,
              display_name: userData.display_name,
              role: userData.role,
              profile_picture: userData.profile_picture,
            }));
            
            if (userData.profile_picture && 
                typeof userData.profile_picture === 'string' && 
                userData.profile_picture.trim() !== '' &&
                (userData.profile_picture.startsWith('http://') || 
                 userData.profile_picture.startsWith('https://'))) {
              setProfilePicture(userData.profile_picture);
            } else {
              setProfilePicture('');
            }
            
            const currentUser = JSON.parse(localStorage.getItem('studentstore_user') || '{}');
            const updatedUser = { ...currentUser, ...userData };
            localStorage.setItem('studentstore_user', JSON.stringify(updatedUser));
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (user) {
      fetchUserProfile();
    }
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const userStr = localStorage.getItem('studentstore_user');
      if (userStr) {
        try {
          const parsedUser = JSON.parse(userStr);
          setUser(parsedUser);
          
          if (parsedUser.profile_picture) {
            setProfilePicture(parsedUser.profile_picture);
          } else {
            setProfilePicture('');
          }
        } catch (error) {
          console.error('Error parsing user:', error);
        }
      }
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.display_name || user?.email.split('@')[0] || 'Student';
  };

  // ✅ IMPROVED SkillStoreLogo Component - Same as StudentStore
  const SkillStoreLogo = ({ mobile = false }: { mobile?: boolean }) => {
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [isSwipingRight, setIsSwipingRight] = useState(false);
    const [swipeProgress, setSwipeProgress] = useState(0);
    const [clickCount, setClickCount] = useState(0);
    const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);

    // ✅ SWIPE HANDLERS (Mobile/Touch devices)
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
      setTouchStart(e.targetTouches[0].clientX);
      setTouchEnd(e.targetTouches[0].clientX);
      setIsSwipingRight(false);
      setSwipeProgress(0);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
      const currentX = e.targetTouches[0].clientX;
      setTouchEnd(currentX);
      const distance = currentX - touchStart;
      
      if (distance > 0) {
        setIsSwipingRight(true);
        const progress = Math.min(distance / 100, 1);
        setSwipeProgress(progress);
      }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      const distance = touchEnd - touchStart;
      const isRightSwipe = distance > 50;

      if (isRightSwipe) {
        console.log('✨ Right swipe detected → StudentStore');
        window.location.href = '/';
      }
      
      setIsSwipingRight(false);
      setSwipeProgress(0);
    };

    // ✅ DOUBLE-CLICK HANDLER
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      
      setClickCount(prev => prev + 1);

      if (clickTimer) {
        clearTimeout(clickTimer);
      }

      const timer = setTimeout(() => {
        if (clickCount + 1 === 1) {
          console.log('🎓 Single click → SkillStore home');
          window.location.href = '/skillstore';
        }
        setClickCount(0);
      }, 300);

      setClickTimer(timer);

      if (clickCount + 1 >= 2) {
        console.log('🏠 Double-click detected → StudentStore');
        if (clickTimer) clearTimeout(clickTimer);
        setClickCount(0);
        window.location.href = '/';
      }
    };

    useEffect(() => {
      return () => {
        if (clickTimer) clearTimeout(clickTimer);
      };
    }, [clickTimer]);

    if (mobile) {
      return (
        <div style={{ perspective: '1000px' }}>
          <div 
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleClick}
            className="group flex flex-col items-start space-x-0 transition-all duration-300 active:scale-95 cursor-pointer select-none"
            title="Swipe right → StudentStore | Double tap → StudentStore | Single tap → SkillStore"
            style={{ 
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              WebkitTouchCallout: 'none',
              transform: `rotateY(${swipeProgress * 90}deg)`,
              transformStyle: 'preserve-3d',
              transition: isSwipingRight ? 'none' : 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
              transformOrigin: 'center'
            }}
          >
            <div className="flex items-center space-x-2">
              <div 
                className="skillstore-icon-badge" 
                style={{ width: '36px', height: '36px', fontSize: '1.125rem' }}
              >
                🎓
              </div>
              <span className="skillstore-logo-gradient" style={{ fontSize: '1.25rem' }}>
                SkillStore
              </span>
            </div>
            <div className="text-xs text-gray-600 font-medium mt-1">
              By Students, For Students
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={handleClick}
        className="group flex items-center space-x-3 transition-all duration-300 active:scale-95 cursor-pointer select-none"
        title="Click → SkillStore | Double-click → StudentStore"
        style={{ 
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <div className="flex items-center space-x-3">
          <div className="skillstore-icon-badge" style={{ width: '48px', height: '48px', fontSize: '1.5rem' }}>
            🎓
          </div>
          <span className="skillstore-logo-gradient" style={{ fontSize: '1.5rem' }}>
            SkillStore
          </span>
        </div>
      </div>
    );
  };

  const ProfileAvatar = ({ 
    size = 'w-12 h-12', 
    textSize = 'text-base',
    mobile = false 
  }: { 
    size?: string; 
    textSize?: string;
    mobile?: boolean;
  }) => {
    const sizeClass = mobile ? 'w-10 h-10' : size;
    const textClass = mobile ? 'text-sm' : textSize;

    if (profilePicture && profilePicture.trim() !== '') {
      return (
        <img
          src={profilePicture}
          alt={getDisplayName()}
          className={`profile-avatar ${sizeClass}`}
          onError={(e) => {
            e.currentTarget.onerror = null;
            setProfilePicture('');
          }}
        />
      );
    }

    return (
      <div className={`profile-avatar-fallback ${sizeClass} ${textClass}`}>
        {user ? getInitials(user.email) : 'ST'}
      </div>
    );
  };

  return (
    <>
      <nav className="skillstore-navbar sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-between items-center h-20 gap-4">
            {/* Left: Logo + Tagline */}
            <div className="flex items-center gap-4">
              <SkillStoreLogo />
              <div className="hidden lg:block">
                <div className="text-sm text-gray-600 font-medium">
                  By Students, For Students
                </div>
              </div>
            </div>

            {/* Center: Search Bar */}
            <SkillstoreSearchBar mobile={false} />

            {/* Right: Actions */}
            <div className="flex items-center space-x-6">
              {/* Bookmarks Button */}
              {user ? (
                <Link
                  href="/skillstore/bookmarks"
                  className="relative group p-3 rounded-xl hover:bg-purple-500/10 transition-all duration-200"
                  title="My Bookmarks"
                >
                  <span className="text-2xl">⭐</span>
                  {bookmarkCount > 0 && (
                    <span className="bookmark-badge">
                      {bookmarkCount > 99 ? '99+' : bookmarkCount}
                    </span>
                  )}
                </Link>
              ) : null}

              {/* Profile Avatar - Just Icon (Like StudentStore) */}
              {user ? (
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="p-1 rounded-full hover:bg-purple-50 transition-all duration-200 hover:scale-110"
                  title={`${getDisplayName()} - Go to Profile`}
                >
                  <ProfileAvatar />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                    window.location.href = `${apiUrl}/auth/google`;
                  }}
                  className="skillstore-btn-primary px-6 py-3"
                >
                  Join SkillStore
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex justify-between items-start h-auto py-4">
              <SkillStoreLogo mobile={true} />

              <div className="flex items-center space-x-3">
                {/* Bookmarks Button */}
                {user && (
                  <Link
                    href="/skillstore/bookmarks"
                    className="relative p-2 rounded-lg hover:bg-purple-50 transition-all"
                  >
                    <span className="text-xl">⭐</span>
                    {bookmarkCount > 0 && (
                      <span className="bookmark-badge" style={{ width: '1.25rem', height: '1.25rem', fontSize: '0.625rem' }}>
                        {bookmarkCount > 9 ? '9+' : bookmarkCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Profile Button - Just Icon */}
                {user ? (
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="p-1 rounded-full hover:bg-purple-50 transition-all duration-200"
                    title="Go to Profile"
                  >
                    <ProfileAvatar mobile={true} />
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                      window.location.href = `${apiUrl}/auth/google`;
                    }}
                    className="skillstore-btn-primary px-4 py-2 text-sm"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Search Bar - Full Width Below Navbar */}
            <SkillstoreSearchBar mobile={true} />
          </div>
        </div>
      </nav>
    </>
  );
}
