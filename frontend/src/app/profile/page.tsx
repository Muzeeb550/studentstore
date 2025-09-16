'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

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

interface ApiError {
  status: string;
  message: string;
  code?: string;
  retryAfter?: number;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: Date | null }>({
    remaining: 5,
    resetTime: null
  });
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        console.log('👤 Current user data:', parsedUser);
        setUser(parsedUser);
        
        // Set existing profile picture if available
        if (parsedUser.profile_picture) {
          setProfilePicture(parsedUser.profile_picture);
        }
        
        // Fetch fresh user data from backend
        fetchUserProfile();
      } catch (error) {
        console.error('Error parsing user data:', error);
        router.push('/');
        return;
      }
    } else {
      router.push('/');
      return;
    }
    setLoading(false);
  }, [router]);

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
          console.log('📋 Fetched user data:', userData);
          
          if (user) {
            setUser({
              ...user,
              name: userData.name,
              display_name: userData.display_name,
              profile_picture: userData.profile_picture
            });
          }
          
          if (userData.profile_picture) {
            setProfilePicture(userData.profile_picture);
          }
          
          // Update localStorage with complete user data
          const currentUser = JSON.parse(localStorage.getItem('studentstore_user') || '{}');
          const updatedUser = { ...currentUser, ...userData };
          localStorage.setItem('studentstore_user', JSON.stringify(updatedUser));
        }
      } else {
        console.error('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Enhanced frontend validation
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    alert('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
    return;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    alert(`File is too large. Please select an image smaller than ${maxSize / 1024 / 1024}MB.`);
    return;
  }

  // Check rate limit before attempting upload
  if (rateLimitInfo.remaining <= 0 && rateLimitInfo.resetTime && rateLimitInfo.resetTime > new Date()) {
    alert(`Upload limit reached. Please wait until ${rateLimitInfo.resetTime.toLocaleTimeString()} before trying again.`);
    return;
  }

  setUploading(true);

  try {
    const token = localStorage.getItem('studentstore_token');
    console.log('🔑 Token exists:', !!token);
    
    console.log('📡 Calling ImageKit auth endpoint...');
    
    const authResponse = await fetch('http://localhost:5000/api/users/imagekit-auth', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    console.log('📡 Auth response status:', authResponse.status);
    
    // IMPROVED: Better rate limit handling for auth endpoint
    if (authResponse.status === 429) {
      const errorData = await authResponse.json();
      console.log('⚠️ Rate limit hit on auth endpoint:', errorData);
      
      // Update rate limit info
      if (errorData.retryAfter) {
        const retryTime = new Date(Date.now() + (errorData.retryAfter * 1000));
        setRateLimitInfo({ remaining: 0, resetTime: retryTime });
      }
      
      throw errorData;
    }
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ Auth response error:', errorText);
      throw new Error(`Failed to get upload authentication: ${authResponse.status} - ${errorText}`);
    }
    
    const authResult = await authResponse.json();
    console.log('🔑 ImageKit auth success:', {
      hasToken: !!authResult.token,
      hasSignature: !!authResult.signature,
      expire: authResult.expire
    });
    
    // Update rate limit info from headers
    const remaining = authResponse.headers.get('X-RateLimit-Remaining');
    const resetTime = authResponse.headers.get('X-RateLimit-Reset');
    if (remaining && resetTime) {
      setRateLimitInfo({
        remaining: parseInt(remaining),
        resetTime: new Date(parseInt(resetTime) * 1000)
      });
    }
    
    const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
    if (!publicKey) {
      console.error('❌ ImageKit public key not found');
      throw new Error('Upload configuration missing. Please contact support.');
    }
    
    // Upload to ImageKit with EXACT parameters from backend
    const uploadData = new FormData();
    uploadData.append('file', file);
    uploadData.append('fileName', `profile_${user?.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
    uploadData.append('folder', '/studentstore/profiles');
    
    // Use EXACT auth parameters from ImageKit (don't modify)
    uploadData.append('token', authResult.token);
    uploadData.append('signature', authResult.signature);
    uploadData.append('expire', authResult.expire.toString());
    uploadData.append('publicKey', publicKey);

    // Add optional metadata (this won't affect signature)
    uploadData.append('tags', `user_${user?.id},profile_picture`);

    console.log('📤 Uploading to ImageKit...');

    const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: uploadData
    });

    const uploadResult = await uploadResponse.json();

    console.log('📡 ImageKit response:', {
      status: uploadResponse.status,
      ok: uploadResponse.ok,
      hasUrl: !!uploadResult.url,
      error: uploadResult.message
    });

    if (uploadResponse.ok) {
      console.log('📸 Upload success:', uploadResult.url);
      setProfilePicture(uploadResult.url);
      
      // Save profile picture to backend
      await saveProfilePicture(uploadResult.url);
      
      // Update rate limit info (decrease remaining)
      setRateLimitInfo(prev => ({
        ...prev,
        remaining: Math.max(0, prev.remaining - 1)
      }));
      
      alert('Profile picture uploaded successfully!');
    } else {
      console.error('Upload failed:', uploadResult);
      throw new Error(uploadResult.message || 'Upload to ImageKit failed');
    }
  } catch (error: any) {
    console.error('❌ Upload error details:', {
      message: error.message || 'Unknown error',
      status: error.status,
      code: error.code,
      retryAfter: error.retryAfter,
      fullError: error
    }); // IMPROVED: Better error logging
    
    // FIXED: Inline error handling instead of separate function
    let errorMessage = 'Unknown error occurred.';
    
    // Handle rate limiting specifically
    if (error.message.includes('rate limit') || error.message.includes('Rate limit') || 
        (error.code && error.code.includes('RATE_LIMIT'))) {
      
      if (error.retryAfter) {
        const retryTime = new Date(Date.now() + (error.retryAfter * 1000));
        setRateLimitInfo({ remaining: 0, resetTime: retryTime });
        errorMessage = `Upload limit reached. Please wait ${Math.ceil(error.retryAfter / 60)} minutes before trying again.`;
      } else {
        errorMessage = 'Upload limit reached. Please wait before trying again.';
      }
    }
    // Handle specific error codes
    else if (error.code) {
      switch (error.code) {
        case 'INVALID_FILE_TYPE':
          errorMessage = 'Invalid file type. Please select a JPG, PNG, GIF, or WebP image.';
          break;
        case 'INVALID_IMAGE_SOURCE':
          errorMessage = 'Please upload the image through the proper upload button.';
          break;
        case 'URL_TOO_LONG':
          errorMessage = 'The image URL is too long. Please try a different image.';
          break;
        default:
          errorMessage = error.message || 'An error occurred while uploading.';
      }
    }
    // Handle general errors
    else {
      errorMessage = error.message || 'Unknown error occurred.';
    }
    
    alert(`Failed to upload image: ${errorMessage}`);
  } finally {
    setUploading(false);
  }
};


  const saveProfilePicture = async (imageUrl: string) => {
  try {
    const token = localStorage.getItem('studentstore_token');
    
    const response = await fetch('http://localhost:5000/api/users/profile/picture', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile_picture: imageUrl })
    });

    // IMPROVED: Better rate limit handling
    if (response.status === 429) {
      const errorData = await response.json();
      console.log('⚠️ Rate limit hit while saving:', errorData); // Better logging
      throw errorData;
    }

    if (response.ok) {
      const result = await response.json();
      if (result.status === 'success') {
        // Update localStorage
        const currentUser = JSON.parse(localStorage.getItem('studentstore_user') || '{}');
        const updatedUser = { ...currentUser, profile_picture: imageUrl };
        localStorage.setItem('studentstore_user', JSON.stringify(updatedUser));
        
        // Update user state
        if (user) {
          setUser({ ...user, profile_picture: imageUrl });
        }
        
        console.log('💾 Profile picture saved to database');
        
        // Trigger navbar update
        window.dispatchEvent(new CustomEvent('profile-updated'));
      }
    } else {
      const errorResult = await response.json();
      console.error('❌ Save profile picture failed:', errorResult); // Better logging
      throw errorResult;
    }
  } catch (error: any) {
    console.error('❌ Error saving profile picture:', {
      message: error.message || 'Unknown error',
      status: error.status,
      code: error.code,
      retryAfter: error.retryAfter
    }); // IMPROVED: Better error logging
    throw error;
  }
};

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.name || user?.display_name || user?.email.split('@')[0] || 'User';
  };

  const getRateLimitMessage = () => {
    if (rateLimitInfo.remaining <= 0 && rateLimitInfo.resetTime) {
      const timeLeft = Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000 / 60);
      return `Upload limit reached. Resets in ${timeLeft} minutes.`;
    }
    if (rateLimitInfo.remaining <= 2) {
      return `${rateLimitInfo.remaining} uploads remaining this hour.`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <Navbar />
      
      {/* Header */}
      <section className="max-w-4xl mx-auto px-4 pt-8 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            My Profile
          </h1>
          <p className="text-xl text-gray-600">
            Manage your profile picture and account information
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              {/* Profile Picture */}
              <div className="text-center mb-6">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-indigo-100"
                    onError={(e) => {
                      console.error('Profile picture failed to load');
                      setProfilePicture(''); // Reset to initials on error
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                    {getInitials(user.email)}
                  </div>
                )}
                <h3 className="font-semibold text-gray-900">{getDisplayName()}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>

              {/* Navigation Tabs */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors duration-200 ${
                    activeTab === 'general'
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    General Info
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors duration-200 ${
                    activeTab === 'account'
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Account
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              
              {/* General Info Tab */}
              {activeTab === 'general' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">General Information</h2>
                    <p className="text-gray-600 mb-6">Update your profile picture and view your account details</p>
                  </div>

                  {/* Rate Limit Warning */}
                  {getRateLimitMessage() && (
                    <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-xl">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-sm text-yellow-800">{getRateLimitMessage()}</p>
                      </div>
                    </div>
                  )}

                  {/* Display Name (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Name
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700">
                      {getDisplayName()}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      This is your name from your Google account and cannot be changed.
                    </p>
                  </div>

                  {/* Profile Picture Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Profile Picture
                    </label>
                    
                    <div className="flex items-center space-x-6">
                      {/* Current Picture */}
                      <div className="flex-shrink-0">
                        {profilePicture ? (
                          <img
                            src={profilePicture}
                            alt="Current profile"
                            className="w-20 h-20 rounded-full object-cover border-4 border-gray-100"
                            onError={(e) => {
                              console.error('Profile picture failed to load');
                              setProfilePicture(''); // Reset to initials on error
                            }}
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                            {getInitials(user.email)}
                          </div>
                        )}
                      </div>

                      {/* Upload Section */}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={handleImageUpload}
                          disabled={uploading || (rateLimitInfo.remaining <= 0)}
                          className="hidden"
                          id="profile-upload"
                        />
                        <label
                          htmlFor="profile-upload"
                          className={`inline-flex items-center px-6 py-3 border border-gray-300 rounded-xl font-medium transition-all duration-200 cursor-pointer ${
                            uploading || (rateLimitInfo.remaining <= 0)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                              : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'
                          }`}
                        >
                          {uploading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
                              Uploading...
                            </>
                          ) : rateLimitInfo.remaining <= 0 ? (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              Upload Limit Reached
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              {profilePicture ? 'Change Picture' : 'Upload Picture'}
                            </>
                          )}
                        </label>
                        <p className="text-sm text-gray-500 mt-2">
                          JPG, PNG, GIF, WebP up to 5MB. Secure upload with rate limiting (5 per hour).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Account Settings</h2>
                    <p className="text-gray-600 mb-6">View your account information and security details</p>
                  </div>

                  {/* Account Info */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Account Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{getDisplayName()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{user.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account Type:</span>
                        <span className="font-medium capitalize">{user.role}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Account ID:</span>
                        <span className="font-medium">#{user.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Login Method:</span>
                        <span className="font-medium">Google OAuth</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Info */}
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-medium text-gray-900 mb-4">Security Status</h3>
                    <div className="space-y-2">
                      <div className="flex items-center text-green-700">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Account is secure and verified
                      </div>
                      <div className="flex items-center text-green-700">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Rate limiting active for security
                      </div>
                      <div className="flex items-center text-green-700">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        File uploads are validated and secure
                      </div>
                    </div>
                  </div>

                  {/* Quick Links */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a
                      href="/dashboard"
                      className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                    >
                      <h4 className="font-medium text-gray-900 mb-1">Back to Dashboard</h4>
                      <p className="text-sm text-gray-500">View your activity and stats</p>
                    </a>
                    <a
                      href="/wishlist"
                      className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                    >
                      <h4 className="font-medium text-gray-900 mb-1">My Wishlist</h4>
                      <p className="text-sm text-gray-500">Manage saved products</p>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
