'use client';

import { useState, useEffect, useRef } from 'react';
import SearchBar from './SearchBar';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        
        // Set profile picture if available
        if (parsedUser.profile_picture) {
          setProfilePicture(parsedUser.profile_picture);
        }
        
        fetchWishlistCount();
        fetchUserProfile(); // Fetch fresh user data including profile picture
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    setLoading(false);
  }, []);

  // Listen for profile updates from profile page
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

      const response = await fetch('http://localhost:5000/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          const userData = result.data;
          
          // Update user state with fresh data
          setUser(prev => ({
            ...prev!,
            name: userData.name,
            display_name: userData.display_name,
            profile_picture: userData.profile_picture
          }));
          
          // Update profile picture state
          if (userData.profile_picture) {
            setProfilePicture(userData.profile_picture);
          } else {
            setProfilePicture('');
          }
          
          // Update localStorage
          const currentUser = JSON.parse(localStorage.getItem('studentstore_user') || '{}');
          const updatedUser = { ...currentUser, ...userData };
          localStorage.setItem('studentstore_user', JSON.stringify(updatedUser));
          
          console.log('🔄 Navbar profile data updated:', {
            hasProfilePicture: !!userData.profile_picture,
            name: userData.name,
            display_name: userData.display_name
          });
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

      const response = await fetch('http://localhost:5000/api/wishlist/count', {
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

  // Listen for wishlist changes from other components
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  const handleNavigation = (url: string) => {
    setDropdownOpen(false);
    window.location.href = url;
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.name || user?.display_name || user?.email.split('@')[0] || 'User';
  };

  // Profile picture component for reuse - PROFESSIONAL SIZING
  const ProfileAvatar = ({ size = 'w-12 h-12', textSize = 'text-base' }: { size?: string; textSize?: string }) => {
    if (profilePicture) {
      return (
        <img
          src={profilePicture}
          alt="Profile"
          className={`${size} rounded-full object-cover ring-2 ring-indigo-200 shadow-sm transition-all duration-200 hover:ring-indigo-300 hover:shadow-md`}
          onError={(e) => {
            console.error('Profile picture failed to load in navbar');
            setProfilePicture(''); // Reset to initials on error
          }}
        />
      );
    }

    return (
      <div className={`${size} bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white ${textSize} font-bold shadow-lg ring-2 ring-white/20 transition-all duration-200 hover:shadow-xl hover:scale-105`}>
        {user ? getInitials(user.email) : ''}
      </div>
    );
  };

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18"> {/* Increased height for better proportions */}
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <a 
              href="/"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              🎓 StudentStore
            </a>
          </div>

          {/* Search Bar - Center */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <SearchBar className="w-full" />
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-6"> {/* Increased spacing */}
            {/* Wishlist Icon - Show for logged in users */}
            {user && (
              <a
                href="/wishlist"
                className="relative group p-3 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:shadow-md"
                title="My Wishlist"
              >
                <svg 
                  className="w-6 h-6 text-gray-700 group-hover:text-red-500 transition-colors duration-200" 
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
                
                {/* Count Badge */}
                {wishlistCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center min-w-[24px] px-1 shadow-lg">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </div>
                )}
              </a>
            )}

            {loading ? (
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-4">
                {/* User Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-4 bg-gray-50 hover:bg-gray-100 rounded-full py-3 px-5 border border-gray-200 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
                  >
                    {/* Profile Picture or Initials - BIGGER SIZE */}
                    <ProfileAvatar />
                    
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-semibold text-gray-900">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 capitalize font-medium">{user.role}</p>
                    </div>
                    {/* Dropdown Arrow */}
                    <svg 
                      className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Modern Boxy Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
                      {/* User Info Header */}
                      <div className="px-6 py-5 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-b border-gray-100">
                        <div className="flex items-center space-x-4">
                          {/* Larger Profile Picture in Dropdown */}
                          <ProfileAvatar size="w-16 h-16" textSize="text-xl" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{getDisplayName()}</p>
                            <p className="text-sm text-gray-600 truncate">{user.email}</p>
                            <p className="text-xs text-indigo-600 font-medium capitalize mt-1">{user.role}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-3">
                        {/* My Dashboard */}
                        <button
                          onClick={() => handleNavigation('/dashboard')}
                          className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group"
                        >
                          <div className="w-11 h-11 bg-gray-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center mr-4 transition-colors duration-200">
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v4H8V5z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">My Dashboard</p>
                            <p className="text-xs text-gray-500">Overview & stats</p>
                          </div>
                        </button>

                        {/* My Profile */}
                        <button
                          onClick={() => handleNavigation('/profile')}
                          className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 group"
                        >
                          <div className="w-11 h-11 bg-gray-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center mr-4 transition-colors duration-200">
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="font-semibold">My Profile</p>
                            <p className="text-xs text-gray-500">Settings & preferences</p>
                          </div>
                        </button>

                        {/* Admin Panel - Only for admins */}
                        {user.role === 'admin' && (
                          <button
                            onClick={() => handleNavigation('/admin')}
                            className="flex items-center w-full px-6 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                          >
                            <div className="w-11 h-11 bg-gray-100 group-hover:bg-red-100 rounded-xl flex items-center justify-center mr-4 transition-colors duration-200">
                              <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="font-semibold">Admin Panel</p>
                              <p className="text-xs text-gray-500">Manage platform</p>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sign Out Button - Outside dropdown */}
                <button 
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 px-5 py-3 rounded-xl font-semibold transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={() => window.location.href = 'http://localhost:5000/auth/google'}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-4">
          <SearchBar className="w-full" />
        </div>
      </div>
    </nav>
  );
}
