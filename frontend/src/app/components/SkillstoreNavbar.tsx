'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBookmarks } from '../context/BookmarkContext';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
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

  // ✅ Fetch user profile
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

  // ✅ Listen for profile updates
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

  const handleLogout = () => {
    localStorage.removeItem('studentstore_token');
    localStorage.removeItem('studentstore_user');
    setUser(null);
    setProfilePicture('');
    setProfileOpen(false);
  };

  const handleLogoDoubleClick = () => {
    window.location.href = '/';
  };

  const handleLogoTap = () => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;

    // If two taps within 300ms = double tap
    if (tapLength < 300 && tapLength > 0) {
      handleLogoDoubleClick();
    }

    setLastTapTime(currentTime);
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.display_name || user?.email.split('@')[0] || 'Student';
  };

  const SkillStoreLogo = ({ mobile = false }: { mobile?: boolean }) => (
    <Link
      href="/skillstore"
      onDoubleClick={handleLogoDoubleClick}
      onTouchEnd={mobile ? handleLogoTap : undefined}
      className={`group flex ${mobile ? 'flex-col items-start' : 'items-center'} ${mobile ? 'space-x-0' : 'space-x-3'} transition-all duration-300 active:scale-95 cursor-pointer`}
    >
      <div className="flex items-center space-x-2">
        <div 
          className="skillstore-icon-badge" 
          style={{ width: mobile ? '36px' : '48px', height: mobile ? '36px' : '48px', fontSize: mobile ? '1.125rem' : '1.5rem' }}
        >
          🎓
        </div>
        <span 
          className="skillstore-logo-gradient" 
          style={{ fontSize: mobile ? '1.25rem' : '1.5rem' }}
        >
          SkillStore
        </span>
      </div>
      {mobile && (
        <div className="text-xs text-gray-600 font-medium mt-1">
          By Students, For Students
        </div>
      )}
    </Link>
  );

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

              {/* Profile Dropdown */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center space-x-3 bg-white hover:bg-purple-50 rounded-full py-3 px-5 border border-purple-200 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                  >
                    <ProfileAvatar />
                    
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-semibold text-gray-900">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize font-medium">
                        {user?.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                      </p>
                    </div>
                    
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${profileOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {profileOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileOpen(false)}
                      ></div>
                      
                      <div 
                        className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-4 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-sm truncate">
                                {getDisplayName()}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="py-2">
                          <a
                            href="/"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                          >
                            🛍️ StudentStore
                          </a>

                          {user?.role === 'admin' && (
                            <>
                              <div className="border-t border-gray-200 my-2"></div>
                              <a
                                href="/admin"
                                className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                              >
                                🛠️ Admin Panel
                              </a>
                            </>
                          )}

                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            🚪 Logout
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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

                {/* Profile Button */}
                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setProfileOpen(!profileOpen)}
                      className="p-1 rounded-full hover:bg-purple-50 transition-all"
                    >
                      <ProfileAvatar mobile={true} />
                    </button>

                    {profileOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setProfileOpen(false)}
                        ></div>

                        {/* Mobile Menu */}
                        <div 
                          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Profile Header */}
                          <div className="px-4 py-3 bg-gradient-to-r from-purple-50 via-blue-50 to-purple-50 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <ProfileAvatar />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-xs truncate">
                                  {getDisplayName()}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="py-2">
                            <a
                              href="/"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                            >
                              🛍️ StudentStore
                            </a>

                            {user?.role === 'admin' && (
                              <>
                                <div className="border-t border-gray-200 my-2"></div>
                                <a
                                  href="/admin"
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 transition-colors"
                                >
                                  🛠️ Admin Panel
                                </a>
                              </>
                            )}

                            <div className="border-t border-gray-200 my-2"></div>
                            <button
                              onClick={handleLogout}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              🚪 Logout
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
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
          </div>
        </div>
      </nav>
    </>
  );
}
