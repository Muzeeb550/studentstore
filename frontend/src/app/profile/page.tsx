'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import imageCompression from 'browser-image-compression';
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

interface ApiError {
  status: string;
  message: string;
  code?: string;
  retryAfter?: number;
}

// ✅ NEW: Post interface
interface UserPost {
  id: number;
  product_name: string;
  product_review: string;
  product_images: string;
  product_price: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  recommendation_id?: number;
  recommended_at?: string;
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
  
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compressionStatus, setCompressionStatus] = useState<string>('');
  
  const router = useRouter();

  const [studentStats, setStudentStats] = useState({
    wishlistItems: 0,
    reviewsWritten: 0
  });

  // ✅ NEW: My Posts state
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        logger.debug('User data loaded');
        setUser(parsedUser);
        
        if (parsedUser.profile_picture) {
          setProfilePicture(parsedUser.profile_picture);
        }
        
        fetchUserProfile();
        fetchUserStats();
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
          logger.debug('User profile fetched');
          
          if (user) {
            setUser({
              ...user,
              name: userData.name,
              display_name: userData.display_name,
              profile_picture: userData.profile_picture
            });
          }
          
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
      } else {
        console.error('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/users/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          const stats = result.data.stats;
          logger.debug('User stats fetched');

          setStudentStats({
            wishlistItems: stats.wishlist_count || 0,
            reviewsWritten: stats.total_reviews || 0
          });
        }
      } else {
        console.error('Failed to fetch user stats:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // ✅ NEW: Fetch user's posts
  const fetchMyPosts = async () => {
    setPostsLoading(true);
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/posts/my-posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          setMyPosts(result.data.posts);
          logger.debug('User posts fetched:', result.data.total);
        }
      } else {
        console.error('Failed to fetch user posts:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // ✅ NEW: Fetch posts when My Posts tab is opened
  useEffect(() => {
    if (activeTab === 'myposts' && myPosts.length === 0) {
      fetchMyPosts();
    }
  }, [activeTab]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert(
        `⚠️ File Too Large\n\n` +
        `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB.\n\n` +
        `Maximum file size: 50 MB\n\n` +
        `Please use a smaller image or compress it first.`
      );
      return;
    }

    if (rateLimitInfo.remaining <= 0 && rateLimitInfo.resetTime && rateLimitInfo.resetTime > new Date()) {
      alert(`Upload limit reached. Please wait until ${rateLimitInfo.resetTime.toLocaleTimeString()} before trying again.`);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setCompressionStatus('');

    try {
      if (file.size > 15 * 1024 * 1024) {
        setCompressionStatus(`⏳ Large file detected, compression may take 10-15 seconds...`);
      }

      console.log(`📸 Original profile image: ${file.name}`);
      console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Type: ${file.type}`);

      setUploadProgress(10);
      setCompressionStatus(`Processing image...`);

      let compressedFile = file;
      
      if (file.size > 500 * 1024) {
        try {
          setCompressionStatus(`Compressing ${file.name}...`);
          setUploadProgress(20);
          
          const compressionOptions = {
            maxSizeMB: file.size > 5 * 1024 * 1024 ? 0.5 : 1,
            maxWidthOrHeight: 800,
            useWebWorker: true,
            initialQuality: file.size > 5 * 1024 * 1024 ? 0.7 : 0.8,
            fileType: file.type
          };

          console.log(`🔄 Compressing profile image...`);
          
          compressedFile = await imageCompression(file, compressionOptions);
          
          const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
          const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
          const savingsPercent = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1);
          
          console.log(`✅ Compression successful!`);
          console.log(`   Original: ${originalSizeMB} MB`);
          console.log(`   Compressed: ${compressedSizeMB} MB`);
          console.log(`   Savings: ${savingsPercent}%`);
          
          setCompressionStatus(`Compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${savingsPercent}% saved)`);
          setUploadProgress(30);
          
        } catch (compressionError) {
          console.warn(`⚠️ Compression failed for ${file.name}, using original:`, compressionError);
          setCompressionStatus(`Compression failed, checking size...`);
          compressedFile = file;
        }
      } else {
        console.log(`✅ Image is already small (${(file.size / 1024 / 1024).toFixed(2)} MB), skipping compression`);
        setCompressionStatus(`Image already optimized`);
        setUploadProgress(30);
      }

      const maxSize = 10 * 1024 * 1024;
      if (compressedFile.size > maxSize) {
        const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
        const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
        
        alert(
          `⚠️ Unable to compress ${file.name} enough\n\n` +
          `Original size: ${originalSizeMB} MB\n` +
          `Compressed size: ${compressedSizeMB} MB\n` +
          `Maximum allowed: 10 MB\n\n` +
          `Please choose a smaller image or try a different photo.`
        );
        return;
      }

      console.log(`✅ Compressed file size OK: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB (within 10MB limit)`);

      setUploadProgress(40);
      setCompressionStatus(`Authenticating upload...`);

      const token = localStorage.getItem('studentstore_token');
      logger.debug('Token validation');
      
      console.log('📡 Calling ImageKit auth endpoint...');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const authResponse = await fetch(`${apiUrl}/api/users/imagekit-auth?usage=profile&priority=high`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      console.log('📡 Auth response status:', authResponse.status);
      
      if (authResponse.status === 429) {
        const errorData = await authResponse.json();
        console.log('⚠️ Rate limit hit on auth endpoint:', errorData);
        
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
      
      const remaining = authResponse.headers.get('X-RateLimit-Remaining');
      const resetTime = authResponse.headers.get('X-RateLimit-Reset');
      if (remaining && resetTime) {
        setRateLimitInfo({
          remaining: parseInt(remaining),
          resetTime: new Date(parseInt(resetTime) * 1000)
        });
      }

      setUploadProgress(50);
      
      const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
      if (!publicKey) {
        console.error('❌ ImageKit public key not found');
        throw new Error('Upload configuration missing. Please contact support.');
      }

      setUploadProgress(60);
      setCompressionStatus(`Uploading profile picture...`);
      
      const uploadData = new FormData();
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      uploadData.append('file', compressedFile);
      uploadData.append('fileName', `profile_${user?.id}_${timestamp}_${sanitizedFileName}`);
      uploadData.append('folder', '/studentstore/profiles');
      
      uploadData.append('token', authResult.token);
      uploadData.append('signature', authResult.signature);
      uploadData.append('expire', authResult.expire.toString());
      uploadData.append('publicKey', publicKey);

      const compressionTag = compressedFile.size < file.size ? 'compressed' : 'original';
      uploadData.append('tags', `user_${user?.id},profile_picture,${compressionTag}`);
      
      uploadData.append('responseFields', 'tags,url,thumbnailUrl,fileId,name,size,filePath');

      console.log(`📤 Uploading to ImageKit: ${sanitizedFileName} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);

      setUploadProgress(80);

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
        console.log(`✅ Profile picture uploaded successfully:`, {
          url: uploadResult.url,
          fileId: uploadResult.fileId,
          finalSize: `${(uploadResult.size / 1024).toFixed(0)} KB`
        });
        
        setUploadProgress(90);
        setCompressionStatus(`Saving to profile...`);
        
        setProfilePicture(uploadResult.url);
        
        await saveProfilePicture(uploadResult.url);
        
        setUploadProgress(100);
        setCompressionStatus(`Profile picture updated! ✅`);
        
        setRateLimitInfo(prev => ({
          ...prev,
          remaining: Math.max(0, prev.remaining - 1)
        }));
        
        alert('Profile picture uploaded successfully! 🎉');
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
      });
      
      let errorMessage = 'Unknown error occurred.';
      
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
      else if (error.message && error.message.includes('Unable to compress')) {
        errorMessage = `The selected image is too large even after compression.\n\nPlease choose a smaller photo or try a different image.`;
      } else {
        errorMessage = error.message || 'Unknown error occurred.';
      }
      
      setCompressionStatus('Upload failed ❌');
      alert(`Failed to upload image: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setTimeout(() => setCompressionStatus(''), 3000);
    }
  };

  const saveProfilePicture = async (imageUrl: string) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/users/profile/picture`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile_picture: imageUrl })
      });

      if (response.status === 429) {
        const errorData = await response.json();
        console.log('⚠️ Rate limit hit while saving:', errorData);
        throw errorData;
      }

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success') {
          const currentUser = JSON.parse(localStorage.getItem('studentstore_user') || '{}');
          const updatedUser = { ...currentUser, profile_picture: imageUrl };
          localStorage.setItem('studentstore_user', JSON.stringify(updatedUser));
          
          if (user) {
            setUser({ ...user, profile_picture: imageUrl });
          }
          
          console.log('💾 Profile picture saved to database');
          
          window.dispatchEvent(new CustomEvent('profile-updated'));
        }
      } else {
        const errorResult = await response.json();
        console.error('❌ Save profile picture failed:', errorResult);
        throw errorResult;
      }
    } catch (error: any) {
      console.error('❌ Error saving profile picture:', {
        message: error.message || 'Unknown error',
        status: error.status,
        code: error.code,
        retryAfter: error.retryAfter
      });
      throw error;
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.name || user?.display_name || user?.email.split('@')[0] || 'Student';
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

  const ProgressIndicator = () => (
    <div className="space-y-2 mt-2 sm:mt-3">
      <div className="w-full bg-student-light rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-student-blue to-student-green h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      {compressionStatus && (
        <p className="text-xs sm:text-sm text-student-secondary text-center leading-snug px-1">
          {compressionStatus}
        </p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-student-page">
        <Navbar />
        <div className="flex items-center justify-center py-16 sm:py-20">
          <div className="text-center">
            <div className="loading-shimmer rounded-full h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-student-secondary font-medium text-sm sm:text-base">
              Loading your profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />
      
      {/* Breadcrumb - MOBILE RESPONSIVE */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-4 pt-4 sm:pt-6 md:pt-8">
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-student-secondary mb-4 sm:mb-6 bg-student-card rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 shadow-md overflow-x-auto">
          <a href="/" className="hover:text-student-blue transition-colors font-medium whitespace-nowrap flex-shrink-0">
            🏠 StudentStore
          </a>
          <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-student-blue font-semibold whitespace-nowrap flex-shrink-0">
            👤 My Profile
          </span>
        </nav>
      </div>

      {/* Header - MOBILE RESPONSIVE */}
      <section className="max-w-4xl mx-auto px-3 sm:px-4 md:px-4 pb-6 sm:pb-8 md:pb-12">
        <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl border border-border-light mb-6 sm:mb-8">
          <div className="text-center">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-student-blue to-student-green rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-lg sm:text-xl md:text-2xl">👤</span>
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-student-primary">
                  Student Profile
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-student-secondary">
                  Manage your StudentStore account & preferences
                </p>
              </div>
            </div>

            {/* Stats - MOBILE RESPONSIVE */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-student-blue">
                  {studentStats.wishlistItems}
                </div>
                <div className="text-xs sm:text-sm text-student-secondary">
                  Saved Products
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold text-student-green">
                  {studentStats.reviewsWritten}
                </div>
                <div className="text-xs sm:text-sm text-student-secondary">
                  Reviews Written
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid - MOBILE RESPONSIVE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {/* Sidebar - MOBILE RESPONSIVE */}
          <div className="md:col-span-1">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 border border-border-light">
              {/* Profile Picture - MOBILE RESPONSIVE */}
              <div className="text-center mb-4 sm:mb-6">
                {profilePicture && profilePicture.trim() !== '' ? (
                  <img
                    src={profilePicture}
                    alt={getDisplayName()}
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full mx-auto mb-2 sm:mb-3 md:mb-4 object-cover border-4 border-student-blue/20 shadow-lg"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      setProfilePicture('');
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gradient-to-br from-student-blue to-student-green rounded-full flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-bold mx-auto mb-2 sm:mb-3 md:mb-4 shadow-lg flex-shrink-0">
                    {getInitials(user.email)}
                  </div>
                )}
                <h3 className="text-sm sm:text-base font-semibold text-student-primary break-words">
                  {getDisplayName()}
                </h3>
                <p className="text-xs sm:text-sm text-student-secondary break-words">
                  {user.email}
                </p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                    user.role === 'admin' 
                      ? 'bg-student-orange/20 text-student-orange' 
                      : 'bg-student-blue/20 text-student-blue'
                  }`}>
                    {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                  </span>
                </div>
              </div>

              {/* Navigation - MOBILE RESPONSIVE */}
              <nav className="space-y-1 sm:space-y-2">
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${
                    activeTab === 'general'
                      ? 'bg-student-blue text-white font-medium shadow-md'
                      : 'text-student-primary hover:bg-student-light border border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="truncate">Profile</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('account')}
                  className={`w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${
                    activeTab === 'account'
                      ? 'bg-student-green text-white font-medium shadow-md'
                      : 'text-student-primary hover:bg-student-light border border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="truncate">Account</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('activity')}
                  className={`w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${
                    activeTab === 'activity'
                      ? 'bg-student-orange text-white font-medium shadow-md'
                      : 'text-student-primary hover:bg-student-light border border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="truncate">Activity</span>
                  </div>
                </button>

                {/* ✅ NEW: My Posts Tab Button */}
                <button
                  onClick={() => setActiveTab('myposts')}
                  className={`w-full text-left px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${
                    activeTab === 'myposts'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-md'
                      : 'text-student-primary hover:bg-student-light border border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <span className="truncate">My Posts</span>
                    {myPosts.length > 0 && (
                      <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
                        {myPosts.length}
                      </span>
                    )}
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content - MOBILE RESPONSIVE */}
          <div className="md:col-span-3">
            <div className="bg-student-card rounded-lg sm:rounded-xl lg:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 border border-border-light">
              
              {/* Profile Settings Tab - MOBILE RESPONSIVE */}
              {activeTab === 'general' && (
                <div className="space-y-4 sm:space-y-6 md:space-y-8">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary mb-1 sm:mb-2 md:mb-4">
                      Profile Settings
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-student-secondary">
                      Customize your StudentStore profile and manage your personal information
                    </p>
                  </div>

                  {/* Rate Limit Warning - MOBILE RESPONSIVE */}
                  {getRateLimitMessage() && (
                    <div className="p-2.5 sm:p-3 md:p-4 border border-student-orange/30 bg-student-orange/10 rounded-lg sm:rounded-xl">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-student-orange mr-1 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <p className="text-xs sm:text-sm text-student-primary">
                          {getRateLimitMessage()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Display Name - MOBILE RESPONSIVE */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-student-primary mb-1.5 sm:mb-2">
                      Display Name
                    </label>
                    <div className="w-full px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border border-border-light rounded-lg sm:rounded-xl bg-student-light text-student-primary text-xs sm:text-sm md:text-base break-words">
                      {getDisplayName()}
                    </div>
                    <p className="text-xs text-student-secondary mt-1">
                      🔒 This is your name from Google account and cannot be changed here.
                    </p>
                  </div>

                  {/* Profile Picture Upload - MOBILE RESPONSIVE */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-student-primary mb-2 sm:mb-3 md:mb-4">
                      Profile Picture
                    </label>
                    
                    {uploading && (
                      <div className="mb-3 sm:mb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                          <span className="text-xs sm:text-sm font-medium text-student-blue">
                            Processing image... {uploadProgress}%
                          </span>
                          <span className="text-xs sm:text-sm text-student-secondary">
                            Please wait
                          </span>
                        </div>
                        <ProgressIndicator />
                      </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-6">
                      {/* Current Picture */}
                      <div className="flex-shrink-0">
                        {profilePicture && profilePicture.trim() !== '' ? (
                          <img
                            src={profilePicture}
                            alt={getDisplayName()}
                            className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-full object-cover border-4 border-student-blue/20 shadow-lg"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              setProfilePicture('');
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 bg-gradient-to-br from-student-blue to-student-green rounded-full flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-bold shadow-lg flex-shrink-0">
                            {getInitials(user.email)}
                          </div>
                        )}
                      </div>

                      {/* Upload Section - MOBILE RESPONSIVE */}
                      <div className="flex-1 min-w-0">
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
                          className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 border border-border-light rounded-lg sm:rounded-xl font-medium transition-all duration-200 cursor-pointer shadow-md text-xs sm:text-sm md:text-base w-full sm:w-auto ${
                            uploading || (rateLimitInfo.remaining <= 0)
                              ? 'bg-student-light text-student-secondary cursor-not-allowed' 
                              : 'bg-student-card text-student-primary hover:bg-student-light hover:shadow-lg hover:scale-[1.02]'
                          }`}
                        >
                          {uploading ? (
                            <>
                              <div className="loading-shimmer rounded-full h-3 w-3 flex-shrink-0"></div>
                              <span className="truncate">Processing... {uploadProgress}%</span>
                            </>
                          ) : rateLimitInfo.remaining <= 0 ? (
                            <>
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="truncate">Upload Limit Reached</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="truncate">
                                {profilePicture ? 'Change Picture' : 'Upload Picture'}
                              </span>
                            </>
                          )}
                        </label>
                        <p className="text-xs text-student-secondary mt-1 leading-snug">
                          📸 JPG, PNG, GIF, WebP • ✨ Auto-compressed • 🔒 Rate limited (5/hr)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account & Security Tab - MOBILE RESPONSIVE */}
              {activeTab === 'account' && (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary mb-1 sm:mb-2 md:mb-4">
                      Account & Security
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-student-secondary">
                      View your account information and security status
                    </p>
                  </div>

                  {/* Account Info - MOBILE RESPONSIVE */}
                  <div className="bg-student-light rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-border-light">
                    <h3 className="font-medium text-student-primary mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 text-xs sm:text-sm md:text-base">
                      📋 Account Information
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2 md:space-y-3 text-xs sm:text-sm md:text-base">
                      <div className="flex justify-between gap-2">
                        <span className="text-student-secondary">Name:</span>
                        <span className="font-medium text-student-primary break-words text-right">
                          {getDisplayName()}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-student-secondary">Email:</span>
                        <span className="font-medium text-student-primary break-all text-right">
                          {user.email}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-student-secondary">Account Type:</span>
                        <span className={`font-medium ${user.role === 'admin' ? 'text-student-orange' : 'text-student-blue'} whitespace-nowrap`}>
                          {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-student-secondary">Student ID:</span>
                        <span className="font-medium text-student-primary whitespace-nowrap">
                          #{user.id}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-student-secondary">Login Method:</span>
                        <span className="font-medium text-student-green whitespace-nowrap">
                          🔐 Google OAuth
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Security Status - MOBILE RESPONSIVE */}
                  <div className="bg-student-green/10 border border-student-green/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                    <h3 className="font-medium text-student-primary mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 text-xs sm:text-sm md:text-base">
                      🛡️ Security Status
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2 md:space-y-3 text-xs sm:text-sm md:text-base">
                      <div className="flex items-start gap-1.5 text-student-green">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Account is secure and verified</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-student-green">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>Rate limiting active for uploads</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-student-green">
                        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>All uploads are compressed & validated</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Activity Tab - MOBILE RESPONSIVE */}
              {activeTab === 'activity' && (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary mb-1 sm:mb-2 md:mb-4">
                      Student Activity
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-student-secondary">
                      Your StudentStore activity and achievements
                    </p>
                  </div>

                  {/* Activity Stats - MOBILE RESPONSIVE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div className="bg-student-blue/10 border border-student-blue/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                      <h3 className="font-medium text-student-blue mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 text-xs sm:text-sm md:text-base">
                        💖 Wishlist Activity
                      </h3>
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm md:text-base">
                        <div className="flex justify-between">
                          <span className="text-student-secondary">Saved Products:</span>
                          <span className="font-bold text-student-blue">
                            {studentStats.wishlistItems}
                          </span>
                        </div>
                        <div className="text-xs text-student-secondary leading-snug">
                          Keep saving products to build your dream shopping list!
                        </div>
                      </div>
                    </div>

                    <div className="bg-student-green/10 border border-student-green/20 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                      <h3 className="font-medium text-student-green mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 text-xs sm:text-sm md:text-base">
                        ⭐ Review Contributions
                      </h3>
                      <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm md:text-base">
                        <div className="flex justify-between">
                          <span className="text-student-secondary">Reviews Written:</span>
                          <span className="font-bold text-student-green">
                            {studentStats.reviewsWritten}
                          </span>
                        </div>
                        <div className="text-xs text-student-secondary leading-snug">
                          Help fellow students with your honest reviews!
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions - MOBILE RESPONSIVE */}
                  <div className="bg-student-light rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-border-light">
                    <h3 className="font-medium text-student-primary mb-2 sm:mb-3 md:mb-4 text-xs sm:text-sm md:text-base">
                      🚀 Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                      <a
                        href="/wishlist"
                        className="p-2 sm:p-3 md:p-4 border border-border-light rounded-lg sm:rounded-xl hover:bg-student-card transition-all duration-200 hover:shadow-md text-xs sm:text-sm md:text-base"
                      >
                        <h4 className="font-medium text-student-primary mb-0.5 sm:mb-1 flex items-center gap-1">
                          💖 My Wishlist
                        </h4>
                        <p className="text-xs text-student-secondary">
                          View saved products
                        </p>
                      </a>
                      <a
                        href="/my-reviews"
                        className="p-2 sm:p-3 md:p-4 border border-border-light rounded-lg sm:rounded-xl hover:bg-student-card transition-all duration-200 hover:shadow-md text-xs sm:text-sm md:text-base"
                      >
                        <h4 className="font-medium text-student-primary mb-0.5 sm:mb-1 flex items-center gap-1">
                          ⭐ My Reviews
                        </h4>
                        <p className="text-xs text-student-secondary">
                          Manage your reviews
                        </p>
                      </a>
                      <a
                        href="/dashboard"
                        className="p-2 sm:p-3 md:p-4 border border-border-light rounded-lg sm:rounded-xl hover:bg-student-card transition-all duration-200 hover:shadow-md text-xs sm:text-sm md:text-base"
                      >
                        <h4 className="font-medium text-student-primary mb-0.5 sm:mb-1 flex items-center gap-1">
                          📊 Dashboard
                        </h4>
                        <p className="text-xs text-student-secondary">
                          View detailed stats
                        </p>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ✅ NEW: My Posts Tab - CARD GRID */}
              {activeTab === 'myposts' && (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {/* Summary Stats */}
                      <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="text-center flex-1 min-w-[100px]">
                            <div className="text-2xl font-bold text-purple-600">
                              {myPosts.length}
                            </div>
                            <div className="text-xs text-student-secondary">
                              Total Posts
                            </div>
                          </div>
                          <div className="text-center flex-1 min-w-[100px]">
                            <div className="text-2xl font-bold text-green-600">
                              {myPosts.reduce((sum, post) => sum + post.likes_count, 0)}
                            </div>
                            <div className="text-xs text-student-secondary">
                              Total Likes
                            </div>
                          </div>
                          <div className="text-center flex-1 min-w-[100px]">
                            <div className="text-2xl font-bold text-orange-600">
                              {myPosts.reduce((sum, post) => sum + post.dislikes_count, 0)}
                            </div>
                            <div className="text-xs text-student-secondary">
                              Total Dislikes
                            </div>
                          </div>
                        </div>
                      </div>

                  <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-student-primary mb-1 sm:mb-2 md:mb-4">
                      My Posts
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-student-secondary">
                      Posts created from your product recommendations
                    </p>
                  </div>

                  {postsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                      <p className="text-student-secondary">Loading your posts...</p>
                    </div>
                  ) : myPosts.length === 0 ? (
                    <div className="text-center py-12 bg-student-light rounded-lg sm:rounded-xl border border-border-light">
                      <div className="text-5xl mb-4">📱</div>
                      <h3 className="text-lg font-semibold text-student-primary mb-2">
                        No Posts Yet
                      </h3>
                      <p className="text-student-secondary mb-4">
                        When admin creates posts from your recommendations, they'll appear here!
                      </p>
                      <a
                        href="/recommend"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-student-blue text-white rounded-lg hover:bg-student-blue/90 transition"
                      >
                        <span>➕ Recommend a Product</span>
                      </a>
                    </div>
                  ) : (
                    <>
                      {/* Posts Grid - Instagram Style */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {myPosts.map((post) => {
                          let images: string[] = [];
                          try {
                            images = JSON.parse(post.product_images);
                          } catch {
                            images = [];
                          }

                          return (
                            <div
                              key={post.id}
                              onClick={() => router.push('/posts')}
                              className="bg-white rounded-lg sm:rounded-xl border border-border-light overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                            >
                              {/* Product Image */}
                              <div className="relative aspect-square overflow-hidden bg-student-light">
                                {images.length > 0 ? (
                                  <img
                                    src={images[0]}
                                    alt={post.product_name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl">
                                    📦
                                  </div>
                                )}
                                
                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <p className="text-sm mb-2">Click to view on Posts page</p>
                                    <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>

                              {/* Post Info */}
                              <div className="p-3 sm:p-4">
                                <h3 className="font-semibold text-student-primary text-sm sm:text-base mb-2 line-clamp-2">
                                  {post.product_name}
                                </h3>
                                
                                <p className="text-xs sm:text-sm text-student-secondary line-clamp-2 mb-3">
                                  {post.product_review}
                                </p>

                                {/* Stats */}
                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 text-student-green">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558-.641 1.038-1.09 1.408-.558.482-1.2.879-1.915 1.164-1.299.518-2.582 1.184-3.736 1.966.35.485.611 1.026.76 1.604.149.579.195 1.185.14 1.785-.13 1.434-.65 2.768-1.5 3.846a4.488 4.488 0 01-3.393 1.536z" />
                                      </svg>
                                      {post.likes_count}
                                    </span>
                                    <span className="flex items-center gap-1 text-student-orange">
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M15.73 5.25h1.035A7.465 7.465 0 0118 9.375a7.465 7.465 0 01-1.235 4.125h-.148c-.806 0-1.534.446-2.031 1.08a9.04 9.04 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75 2.25 2.25 0 01-2.25-2.25c0-1.152.26-2.243.723-3.218C7.74 15.724 7.366 15.246 7.003 14.82c-.558-.65-1.086-1.338-1.564-2.07-1.073-1.644-1.689-3.627-1.689-5.733 0-1.152.26-2.243.723-3.218.266-.558.641-1.038 1.09-1.408.558-.482 1.2-.879 1.915-1.164C8.777 1.709 10.06 1.043 11.214.26c.35-.243.759-.382 1.179-.382h1.035z" />
                                      </svg>
                                      {post.dislikes_count}
                                    </span>
                                  </div>
                                  
                                  <span className="text-student-secondary">
                                    ₹{parseFloat(post.product_price).toFixed(0)}
                                  </span>
                                </div>

                                {/* Date */}
                                <div className="mt-2 pt-2 border-t border-border-light">
                                  <p className="text-xs text-student-secondary">
                                    Posted {new Date(post.created_at).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      
                    </>
                  )}
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
