'use client';

import { useState, useEffect } from 'react';
import SearchBar from './SearchBar';
import logger from '../utils/logger';

interface User {
  id: number;
  email: string;
  role: string;
  name?: string;
  display_name?: string;
  profile_picture?: string;
  iat: number;
  exp: number;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);

  // ✅ Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileScreen(window.innerWidth <= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        
        if (parsedUser.profile_picture) {
          setProfilePicture(parsedUser.profile_picture);
        }
        
        fetchWishlistCount();
        fetchUserProfile();
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    setLoading(false);
  }, []);

  // ✅ PWA Install event listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      console.log('🎉 beforeinstallprompt fired!');
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    if (isInstalled) {
      console.log('✅ Already installed');
      setShowInstallButton(false);
    } else {
      const timer = setTimeout(() => {
        console.log('📱 Showing install button');
        setShowInstallButton(true);
      }, 2000);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('📲 Install clicked');
    console.log('- Screen type:', isMobileScreen ? 'Mobile' : 'Desktop');
    console.log('- Has deferredPrompt:', !!deferredPrompt);

    if (!isMobileScreen) {
      if (deferredPrompt) {
        console.log('💻 Desktop: Native install');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        logger.debug(`Install prompt outcome: ${outcome}`);
        setDeferredPrompt(null);
        setShowInstallButton(false);
      } else {
        console.log('💻 Desktop: Show modal');
        setShowInstallModal(true);
      }
      return;
    }

    if (isMobileScreen) {
      if (deferredPrompt) {
        console.log('📱 Mobile: Native install (prompt available)');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        logger.debug(`Install prompt outcome: ${outcome}`);
        setDeferredPrompt(null);
        setShowInstallButton(false);
      } else {
        console.log('📱 Mobile: Show modal (no prompt)');
        setShowInstallModal(true);
      }
      return;
    }
  };

  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('📸 Profile updated event received in navbar');
      fetchUserProfile();
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

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
            name: userData.name,
            display_name: userData.display_name,
            profile_picture: userData.profile_picture
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
          
          console.log('🔄 Profile updated');
        }
      }
    } catch (error) {
      console.error('Error fetching user profile in navbar:', error);
    }
  };

  const fetchWishlistCount = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/wishlist/count`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.status === 'success') {
        setWishlistCount(result.data.count);
      }
    } catch (error) {
      console.error('Error fetching wishlist count:', error);
    }
  };

  useEffect(() => {
    const handleWishlistChange = () => {
      if (user) {
        fetchWishlistCount();
      }
    };

    window.addEventListener('wishlist-updated', handleWishlistChange);
    return () => {
      window.removeEventListener('wishlist-updated', handleWishlistChange);
    };
  }, [user]);

  useEffect(() => {
    const handleCountChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.change === 'number') {
        setWishlistCount(prev => Math.max(0, prev + customEvent.detail.change));
      }
    };

    window.addEventListener('wishlist-count-change', handleCountChange);
    
    return () => {
      window.removeEventListener('wishlist-count-change', handleCountChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('studentstore_token');
    localStorage.removeItem('studentstore_user');
    setUser(null);
    setWishlistCount(0);
    setProfilePicture('');
    setDropdownOpen(false);
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.name || user?.display_name || user?.email.split('@')[0] || 'Student';
  };

  const handleLogoDoubleClick = () => {
    window.location.href = '/skillstore';
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

    const StudentStoreLogo = ({ mobile = false }: { mobile?: boolean }) => {
    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;

      // If two taps within 300ms = double tap
      if (tapLength < 300 && tapLength > 0) {
        e.preventDefault();
        handleLogoDoubleClick();
        return;
      }

      setLastTapTime(currentTime);

      // If not a double tap and on mobile, navigate to home
      if (mobile && tapLength > 300) {
        window.location.href = '/';
      }
    };

    if (mobile) {
      return (
        <div 
          onTouchEnd={handleTouchEnd}
          className={`group flex flex-col items-start space-x-0 transition-all duration-300 active:scale-95 cursor-pointer select-none`}
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <div className="flex items-center space-x-3">
            <img 
              src="/favicon-96x96.png" 
              alt="StudentStore Logo" 
              className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-110 group-active:scale-105"
            />
            <span className="logo-gradient text-2xl">
              StudentStore
            </span>
          </div>
          <div className="text-xs text-student-secondary font-medium mt-1 text-center">
            By Students, For Students
          </div>
        </div>
      );
    }

    return (
      <a 
        href="/"
        onDoubleClick={handleLogoDoubleClick}
        className={`group flex items-center space-x-3 transition-all duration-300 active:scale-95 cursor-pointer select-none`}
      >
        <div className="flex items-center space-x-3">
          <img 
            src="/favicon-96x96.png" 
            alt="StudentStore Logo" 
            className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-110 group-active:scale-105"
          />
          <span className="logo-gradient text-2xl">
            StudentStore
          </span>
        </div>
      </a>
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
      <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-border-light sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <StudentStoreLogo />
              <div className="hidden lg:block text-sm text-student-secondary font-medium">
                By Students, For Students
              </div>
            </div>

            <div className="flex-1 max-w-lg mx-8">
              <SearchBar className="w-full" />
            </div>

            <div className="flex items-center space-x-6">
              {/* ✅ Desktop PWA Install Button */}
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-student-blue to-student-green text-white rounded-xl hover:shadow-lg transition-all duration-200 font-medium text-sm"
                  title="Install StudentStore App"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Install App</span>
                </button>
              )}

              {user && (
                <a
                  href="/wishlist"
                  className="relative group p-3 rounded-xl hover:bg-student-blue/10 transition-all duration-200 hover:shadow-md"
                  title="My Wishlist"
                >
                  <svg 
                    className="w-6 h-6 text-student-secondary group-hover:text-student-orange transition-colors duration-200" 
                    fill="none" 
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
                  
                  {wishlistCount > 0 && (
                    <div className="wishlist-badge">
                      {wishlistCount > 99 ? '99+' : wishlistCount}
                    </div>
                  )}
                </a>
              )}

              {loading ? (
                <div className="loading-shimmer w-12 h-12 rounded-full"></div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-4 bg-student-card hover:bg-student-light rounded-full py-3 px-5 border border-border-light transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-student-blue/30"
                  >
                    <ProfileAvatar />
                    
                    <div className="text-left">
                      <p className="text-sm font-semibold text-student-primary">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-student-secondary capitalize font-medium">
                        {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                      </p>
                    </div>
                    
                    <svg 
                      className={`w-5 h-5 text-student-secondary transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* ✅ Desktop Dropdown */}
                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      ></div>
                      
                      <div 
                        className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-4 py-4 bg-gradient-to-r from-student-blue/10 via-student-green/10 to-student-orange/10 border-b border-border-light">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-student-primary text-sm truncate">
                                {getDisplayName()}
                              </p>
                              <p className="text-xs text-student-secondary truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-student-blue font-medium capitalize mt-1">
                                {user.role === 'admin' ? '👑 Admin Access' : '🎓 Student Member'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="py-2">
                          <a
                            href="/dashboard"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-blue/10 transition-colors"
                          >
                            <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            </svg>
                            <span className="font-medium">My Dashboard</span>
                          </a>

                          <a
                            href="/profile"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-green/10 transition-colors"
                          >
                            <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">My Profile</span>
                          </a>

                          <a
                            href="/skillstore"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-green/10 transition-colors"
                          >
                            <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <span className="font-medium">Skill Store</span>
                          </a>

                          {user.role === 'admin' && (
                            <a
                              href="/admin"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-orange/10 transition-colors"
                            >
                              <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              </svg>
                              <span className="font-medium">Admin Panel</span>
                            </a>
                          )}

                          <div className="border-t border-border-light my-2"></div>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="font-medium">Sign Out</span>
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
                  className="bg-gradient-to-r from-student-orange to-student-blue hover:from-student-orange/90 hover:to-student-blue/90 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Join StudentStore</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex justify-between items-start h-auto py-4">
              <StudentStoreLogo mobile={true} />

              <div className="flex items-center space-x-3 mt-1">
                {showInstallButton && (
                  <button
                    onClick={handleInstallClick}
                    className="p-2 rounded-xl bg-student-blue/10 hover:bg-student-blue/20 active:bg-student-blue/30 transition-all duration-200"
                    title="Install StudentStore App"
                  >
                    <svg className="w-5 h-5 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}
                {user && (
                  <a
                    href="/wishlist"
                    className="relative p-2 rounded-xl hover:bg-student-blue/10 active:bg-student-blue/20 transition-all duration-200"
                    title="My Wishlist"
                  >
                    <svg 
                      className="w-6 h-6 text-student-secondary hover:text-student-orange active:text-student-orange transition-colors duration-200" 
                      fill="none" 
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
                    
                    {wishlistCount > 0 && (
                      <div className="wishlist-badge" style={{ width: '1.25rem', height: '1.25rem', fontSize: '0.625rem' }}>
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </div>
                    )}
                  </a>
                )}

                {loading ? (
                  <div className="loading-shimmer w-10 h-10 rounded-full"></div>
                ) : user ? (
                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="p-1 rounded-full hover:bg-student-light active:bg-student-light transition-all duration-200"
                    >
                      <ProfileAvatar mobile={true} />
                    </button>

                    {dropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setDropdownOpen(false)}
                        ></div>

                        <div 
                          className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-4 py-4 bg-gradient-to-r from-student-blue/10 via-student-green/10 to-student-orange/10 border-b border-border-light">
                            <div className="flex items-center space-x-3">
                              <ProfileAvatar size="w-12 h-12" textSize="text-base" />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-student-primary truncate text-sm">{getDisplayName()}</p>
                                <p className="text-xs text-student-secondary truncate">{user.email}</p>
                                <p className="text-xs text-student-blue font-medium capitalize mt-1">
                                  {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="py-2">
                            <a
                              href="/profile"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-blue/10 transition-colors"
                            >
                              <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-medium">My Profile</span>
                            </a>

                            <a
                              href="/dashboard"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-blue/10 transition-colors"
                            >
                              <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              </svg>
                              <span className="font-medium">Dashboard</span>
                            </a>

                            <a
                              href="/skillstore"
                              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-green/10 transition-colors"
                            >
                              <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                              </svg>
                              <span className="font-medium">Skill Store</span>
                            </a>

                            {user.role === 'admin' && (
                              <a
                                href="/admin"
                                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-student-orange/10 transition-colors"
                              >
                                <svg className="w-5 h-5 text-student-secondary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                </svg>
                                <span className="font-medium">Admin Panel</span>
                              </a>
                            )}

                            <div className="border-t border-border-light mt-2 pt-2">
                              <button
                                onClick={handleLogout}
                                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="font-medium">Sign Out</span>
                              </button>
                            </div>
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
                    className="bg-gradient-to-r from-student-orange to-student-blue text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:shadow-lg transform hover:scale-105 active:scale-95"
                  >
                    Join
                  </button>
                )}
              </div>
            </div>

            <div className="pb-4">
              <SearchBar className="w-full" />
            </div>
          </div>
        </div>
      </nav>

      {/* PWA Install Modal */}
      {showInstallModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowInstallModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-student-primary flex items-center">
                <svg className="w-6 h-6 mr-2 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Install StudentStore
              </h3>
              <button
                onClick={() => setShowInstallModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-300 rounded-xl p-5 text-center">
                <div className="flex justify-center mb-3">
                  <svg className="w-16 h-16" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" fill="#FFF"/>
                    <circle cx="24" cy="24" r="16" fill="#4285F4"/>
                    <path d="M24,8 C15.163,8 8,15.163 8,24 L16,24 C16,19.582 19.582,16 24,16 L32,24 C32,28.418 28.418,32 24,32 C19.582,32 16,28.418 16,24 L8,24 C8,32.837 15.163,40 24,40 C32.837,40 40,32.837 40,24 C40,15.163 32.837,8 24,8 Z" fill="#EA4335"/>
                    <path d="M24,32 C19.582,32 16,28.418 16,24 L8,24 C8,32.837 15.163,40 24,40 L24,32 Z" fill="#34A853"/>
                    <path d="M24,32 L32,24 C32,28.418 28.418,32 24,32 Z" fill="#FBBC05"/>
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2">
                  <span className="text-blue-600">INSTALLING</span> StudentStore from <span className="text-blue-600">Chrome</span> is the safest way.
                </h4>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
                <h5 className="font-bold text-gray-900 mb-4 flex items-center text-base">
                  <span className="text-xl mr-2">📋</span>
                  Quick Install Steps
                </h5>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      1
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-2">
                        Copy this link
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-300">
                        <p className="text-xs text-gray-600 mb-2 font-medium">📎 App Link:</p>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value="studentstore-zeta.vercel.app"
                            readOnly
                            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={(e) => {
                              navigator.clipboard.writeText('https://studentstore-zeta.vercel.app/');
                              const btn = e.currentTarget;
                              const originalHTML = btn.innerHTML;
                              btn.innerHTML = '✓';
                              btn.classList.add('bg-green-600');
                              setTimeout(() => {
                                btn.innerHTML = originalHTML;
                                btn.classList.remove('bg-green-600');
                              }, 2000);
                            }}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 active:scale-95 transition-all whitespace-nowrap"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        Open <span className="text-blue-600 font-bold">CHROME</span> and paste the link
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="flex-shrink-0 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        Tap the <span className="text-green-600 font-bold">Install</span> button and get the app safely <span className="text-green-600 font-bold">INSTALLED</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInstallModal(false)}
                className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white py-3.5 rounded-xl font-bold hover:shadow-lg active:scale-95 transition-all duration-200 text-base"
              >
                Got it! 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
