'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import StarRating from '../components/StarRating';
import imageCompression from 'browser-image-compression';
import logger from '../utils/logger';
import ActivityModal from '../components/modals/ActivityModal';
import AccountModal from '../components/modals/AccountModal';
import UploadModal from '../components/modals/UploadModal';
import PublicProfilePostCard from '../components/PublicProfilePostCard';

// ===== INTERFACES =====

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

interface Review {
  id: number;
  rating: number;
  review_text: string;
  review_images: string;
  helpful_count: number;
  not_helpful_count: number;
  helpfulness_score: number;
  created_at: string;
  updated_at: string;
  product_id: number;
  product_name: string;
  product_images: string;
}

interface Pagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface DashboardStats {
  wishlist_count: number;
  products_viewed: number;
  member_since: string;
  member_since_raw: string;
  days_since_joining: number;
  total_reviews: number;
  average_rating_given: number;
  first_review_date: string | null;
  latest_review_date: string | null;
}

export default function ProfilePage() {
  const router = useRouter();

  // ===== USER & PROFILE STATE =====
  const [user, setUser] = useState<User | null>(null);
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // ===== TAB STATE =====
  const [activeTab, setActiveTab] = useState<'posts' | 'reviews'>('posts');

  // ===== POSTS STATE =====
  const [myPosts, setMyPosts] = useState<UserPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // ===== REVIEWS STATE =====
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPagination, setReviewsPagination] = useState<Pagination | null>(null);
  const [reviewsPage, setReviewsPage] = useState(1);

  // ===== STATS STATE =====
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // ===== MODAL STATE =====
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // ===== BURGER MENU STATE =====
  const [burgerMenuOpen, setBurgerMenuOpen] = useState(false);

  // ===== PROFILE PICTURE UPLOAD STATE =====
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compressionStatus, setCompressionStatus] = useState<string>('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: Date | null }>({
    remaining: 5,
    resetTime: null
  });

  // ===== INITIAL LOAD =====
  useEffect(() => {
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        
        if (parsedUser.profile_picture) {
          setProfilePicture(parsedUser.profile_picture);
        }
        
        // Fetch all data
        fetchUserProfile();
        fetchDashboardStats();
        fetchMyPosts();
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

  // ===== FETCH USER PROFILE =====
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
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  // ===== FETCH MY POSTS =====
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
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  // ===== FETCH MY REVIEWS =====
  const fetchMyReviews = async (page: number = 1) => {
    setReviewsLoading(true);
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/reviews/my-reviews?page=${page}&limit=12`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        setReviews(result.data.reviews);
        setReviewsPagination(result.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // ===== FETCH DASHBOARD STATS =====
  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/users/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        setStats(result.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // ===== FETCH REVIEWS WHEN REVIEWS TAB IS OPENED =====
  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0) {
      fetchMyReviews(1);
    }
  }, [activeTab]);

  // ===== HELPER FUNCTIONS =====
  const getInitials = (email: string) => {
    return email.substring(0, 1).toUpperCase();
  };

  const getDisplayName = () => {
    return user?.name || user?.display_name || user?.email.split('@')[0] || 'Student';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const parseProductImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  const parseReviewImages = (imageString: string): string[] => {
    try {
      return JSON.parse(imageString) || [];
    } catch {
      return [];
    }
  };

  // ===== PROFILE PICTURE UPLOAD =====
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
          console.warn(`⚠️ Compression failed, using original:`, compressionError);
          setCompressionStatus(`Compression failed, checking size...`);
          compressedFile = file;
        }
      } else {
        console.log(`✅ Image already small, skipping compression`);
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
          `Please choose a smaller image.`
        );
        return;
      }

      console.log(`✅ File size OK: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);

      setUploadProgress(40);
      setCompressionStatus(`Authenticating upload...`);

      const token = localStorage.getItem('studentstore_token');
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const authResponse = await fetch(`${apiUrl}/api/users/imagekit-auth?usage=profile&priority=high`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (authResponse.status === 429) {
        const errorData = await authResponse.json();
        if (errorData.retryAfter) {
          const retryTime = new Date(Date.now() + (errorData.retryAfter * 1000));
          setRateLimitInfo({ remaining: 0, resetTime: retryTime });
        }
        throw errorData;
      }
      
      if (!authResponse.ok) {
        throw new Error(`Failed to get upload authentication`);
      }
      
      const authResult = await authResponse.json();
      
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
        throw new Error('Upload configuration missing.');
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
      uploadData.append('tags', `user_${user?.id},profile_picture`);
      uploadData.append('responseFields', 'tags,url,thumbnailUrl,fileId,name,size,filePath');

      setUploadProgress(80);

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: uploadData
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok) {
        console.log('✅ Upload success:', uploadResult.url);
        
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
        setShowUploadModal(false);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Unknown error occurred.';
      
      if (error.message && error.message.includes('rate limit')) {
        errorMessage = 'Upload limit reached. Please wait before trying again.';
      } else {
        errorMessage = error.message || 'Failed to upload image.';
      }
      
      setCompressionStatus('Upload failed ❌');
      alert(`Failed to upload image: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setTimeout(() => setCompressionStatus(''), 3000);
    }
  };

  // ===== SAVE PROFILE PICTURE TO DATABASE =====
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
        throw errorResult;
      }
    } catch (error: any) {
      console.error('❌ Error saving profile picture:', error);
      throw error;
    }
  };

  // ===== LOADING STATE =====
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

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-student-page">
      <Navbar />

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-6 sm:pb-8">

      {/* Breadcrumb - MOBILE RESPONSIVE */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-4 sm:pt-6">
        <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-student-secondary mb-4 sm:mb-6 bg-student-card rounded-lg sm:rounded-xl p-2.5 sm:p-3 shadow-md overflow-x-auto">
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
        
        {/* Header Section with Burger Menu */}
        <div className="relative bg-student-card rounded-xl lg:rounded-2xl shadow-xl border border-border-light p-6 sm:p-8 mb-6">
          
          {/* Burger Menu Button - Top Right */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <button
              onClick={() => setBurgerMenuOpen(!burgerMenuOpen)}
              className="p-2 hover:bg-student-light rounded-lg transition-all duration-200 border border-border-light"
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-student-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Burger Menu Dropdown */}
            {burgerMenuOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setBurgerMenuOpen(false)}
                ></div>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">

                   {/* ✅ NEW: Admin Panel Link (Only for Admins) */}
                  {user?.role === 'admin' && (
                    <a
                      href="/admin"
                      className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">Admin Panel</span>
                    </a>
                  )}

                  <a
                    href="/dashboard"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-student-blue/10 transition-colors"
                  >
                    <svg className="w-5 h-5 text-student-blue mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    <span className="font-medium">Dashboard</span>
                  </a>

                  {/* ✅ NEW: Skill Store Link */}
                  <a
                    href="/skillstore"
                    className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-purple-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium">Skill Store</span>
                  </a>

                  <button
                    onClick={() => {
                      setShowActivityModal(true);
                      setBurgerMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-student-green/10 transition-colors"
                  >
                    <svg className="w-5 h-5 text-student-green mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="font-medium">Activity</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAccountModal(true);
                      setBurgerMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-student-orange/10 transition-colors"
                  >
                    <svg className="w-5 h-5 text-student-orange mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium">Account</span>
                  </button>
                  {/* ✅ NEW: Divider + Sign Out Button */}
                  <div className="border-t border-gray-200 my-2"></div>

                  <button
                    onClick={() => {
                      localStorage.removeItem('studentstore_token');
                      localStorage.removeItem('studentstore_user');
                      window.location.href = '/';
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
{/* Profile Picture - Center - Clickable */}
          <div className="flex flex-col items-center text-center">
            <button
              onClick={() => setShowUploadModal(true)}
              className="relative group mb-4"
            >
              {profilePicture && profilePicture.trim() !== '' ? (
                <div className="relative">
                  <img
                    src={profilePicture}
                    alt={getDisplayName()}
                    className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-student-blue/20 shadow-lg transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      setProfilePicture('');
                    }}
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-student-blue to-student-green rounded-full flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl font-bold shadow-lg transition-transform duration-200 group-hover:scale-105">
                    {getInitials(user.email)}
                  </div>
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </div>
              )}
            </button>

            {/* User Info */}
            <h1 className="text-2xl sm:text-3xl font-bold text-student-primary mb-2">
              {getDisplayName()}
            </h1>
            <p className="text-sm sm:text-base text-student-secondary mb-1">
              {user.email}
            </p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              user.role === 'admin' 
                ? 'bg-student-orange/20 text-student-orange' 
                : 'bg-student-blue/20 text-student-blue'
            }`}>
              {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
            </span>
          </div>
        </div>

        {/* Contribution Heading */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-student-primary mb-2">
            Contribution towards the Community
          </h2>
          <p className="text-sm text-student-secondary">
            Your posts and reviews helping fellow students
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="bg-student-card rounded-xl shadow-lg border border-border-light p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'posts'
                  ? 'bg-student-blue text-white shadow-md'
                  : 'text-student-primary hover:bg-student-light'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <span>Posts</span>
                {myPosts.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {myPosts.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 ${
                activeTab === 'reviews'
                  ? 'bg-student-green text-white shadow-md'
                  : 'text-student-primary hover:bg-student-light'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>Reviews</span>
                {reviewsPagination && reviewsPagination.total > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {reviewsPagination.total}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content Container */}
        <div className="bg-student-card rounded-xl shadow-lg border border-border-light p-4 sm:p-6">
          
          {/* POSTS TAB */}
          {activeTab === 'posts' && (
            <div>
              {postsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-student-blue mx-auto mb-4"></div>
                  <p className="text-student-secondary">Loading your posts...</p>
                </div>
              ) : myPosts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">📱</div>
                  <h3 className="text-lg font-semibold text-student-primary mb-2">
                    No Posts Yet
                  </h3>
                  <p className="text-student-secondary mb-6">
                    When admin creates posts from your recommendations, they'll appear here!
                  </p>
                  <a
                    href="/assistant"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-student-blue text-white rounded-lg hover:bg-student-blue/90 transition"
                  >
                    <span>➕ Recommend a Product</span>
                  </a>
                </div>
              ) : (
                <>
                  {/* Summary Stats */}
                  <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
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

                  {/* Posts Grid - ✅ FIXED: Changed userPosts to myPosts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myPosts.map((post) => (
                      <PublicProfilePostCard key={post.id} post={post} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div>
              {reviewsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-student-green mx-auto mb-4"></div>
                  <p className="text-student-secondary">Loading your reviews...</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">⭐</div>
                  <h3 className="text-lg font-semibold text-student-primary mb-2">
                    No Reviews Yet
                  </h3>
                  <p className="text-student-secondary mb-6">
                    Start sharing your experiences to help fellow students!
                  </p>
                  <a
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-student-green text-white rounded-lg hover:bg-student-green/90 transition"
                  >
                    <span>🛍️ Browse Products</span>
                  </a>
                </div>
              ) : (
                <>
                  {/* Reviews Summary Stats */}
                  {reviewsPagination && (
                    <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="text-center flex-1 min-w-[100px]">
                          <div className="text-2xl font-bold text-green-600">
                            {reviewsPagination.total}
                          </div>
                          <div className="text-xs text-student-secondary">
                            Total Reviews
                          </div>
                        </div>
                        <div className="text-center flex-1 min-w-[100px]">
                          <div className="text-2xl font-bold text-blue-600">
                            {reviews.length > 0 
                              ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                              : '0.0'
                            }★
                          </div>
                          <div className="text-xs text-student-secondary">
                            Avg Rating
                          </div>
                        </div>
                        <div className="text-center flex-1 min-w-[100px]">
                          <div className="text-2xl font-bold text-orange-600">
                            {reviews.reduce((sum, r) => sum + r.helpful_count, 0)}
                          </div>
                          <div className="text-xs text-student-secondary">
                            Helpful Votes
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {reviews.map((review) => {
                      const productImages = parseProductImages(review.product_images);
                      const reviewImages = parseReviewImages(review.review_images);
                      const firstProductImage = productImages[0] || '';
                      
                      return (
                        <div key={review.id} className="bg-white rounded-lg border border-border-light p-4 hover:shadow-lg transition-all duration-300">
                          {/* Review Header */}
                          <div className="flex gap-3 mb-3">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              {firstProductImage ? (
                                <img
                                  src={firstProductImage}
                                  alt={review.product_name}
                                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-border-light shadow-md"
                                />
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-student-light rounded-lg flex items-center justify-center border-2 border-border-light">
                                  <svg className="w-8 h-8 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm sm:text-base font-semibold text-student-primary mb-1 line-clamp-2">
                                    {review.product_name}
                                  </h3>
                                  <div className="flex items-center gap-2 mb-2">
                                    <StarRating rating={review.rating} size="sm" showRatingText={false} />
                                    <span className="text-sm font-medium text-student-primary">
                                      {review.rating}.0
                                    </span>
                                  </div>
                                </div>
                                
                                {/* View Product Link */}
                                <a
                                  href={`/products/${review.product_id}`}
                                  className="text-student-blue hover:text-student-green p-2 hover:bg-student-light rounded-lg transition-all duration-200 flex-shrink-0"
                                  title="View Product"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Review Text */}
                          {review.review_text && (
                            <div className="mb-3">
                              <p className="text-sm text-student-secondary leading-relaxed">
                                {review.review_text}
                              </p>
                            </div>
                          )}

                          {/* Review Images */}
                          {reviewImages.length > 0 && (
                            <div className="mb-3">
                              <div className="flex gap-2 overflow-x-auto pb-2">
                                {reviewImages.slice(0, 4).map((imageUrl, index) => (
                                  <img
                                    key={index}
                                    src={imageUrl}
                                    alt={`Review ${index + 1}`}
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border-light shadow-sm flex-shrink-0"
                                  />
                                ))}
                                {reviewImages.length > 4 && (
                                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-student-light rounded-lg flex items-center justify-center text-student-secondary text-xs font-medium border border-border-light flex-shrink-0">
                                    +{reviewImages.length - 4}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Review Footer */}
                          <div className="flex flex-col gap-2 pt-3 border-t border-border-light">
                            {/* Vote Counts */}
                            {(review.helpful_count > 0 || review.not_helpful_count > 0) ? (
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {review.helpful_count > 0 && (
                                    <div className="flex items-center gap-1 text-xs bg-student-green/10 px-2 py-1 rounded-full">
                                      <svg className="w-3 h-3 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                      </svg>
                                      <span className="font-semibold text-student-green">{review.helpful_count}</span>
                                    </div>
                                  )}
                                  
                                  {review.not_helpful_count > 0 && (
                                    <div className="flex items-center gap-1 text-xs bg-student-orange/10 px-2 py-1 rounded-full">
                                      <svg className="w-3 h-3 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                                      </svg>
                                      <span className="font-semibold text-student-orange">{review.not_helpful_count}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {(review.helpful_count + review.not_helpful_count) >= 5 && (
                                  <div className="text-xs">
                                    <span className={`font-semibold ${
                                      Math.round((review.helpful_count / (review.helpful_count + review.not_helpful_count)) * 100) >= 70 
                                        ? 'text-student-green' 
                                        : 'text-student-orange'
                                    }`}>
                                      {Math.round((review.helpful_count / (review.helpful_count + review.not_helpful_count)) * 100)}%
                                    </span>
                                    <span className="text-student-secondary ml-1">
                                      helpful
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-student-secondary bg-student-light/50 px-2 py-1 rounded-lg w-fit">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                No votes yet
                              </div>
                            )}
                            
                            {/* Date */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-student-secondary">
                                  📅 {formatDate(review.created_at)}
                                </span>
                                {review.updated_at !== review.created_at && (
                                  <span className="text-xs bg-student-orange/10 text-student-orange px-2 py-0.5 rounded-full">
                                    ✏️ Edited
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {reviewsPagination && reviewsPagination.total_pages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setReviewsPage(prev => prev - 1);
                          fetchMyReviews(reviewsPage - 1);
                        }}
                        disabled={!reviewsPagination.has_prev}
                        className="flex items-center gap-2 px-4 py-2 border border-border-light rounded-lg text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      
                      <div className="text-sm text-student-secondary">
                        Page {reviewsPagination.current_page} of {reviewsPagination.total_pages}
                      </div>
                      
                      <button
                        onClick={() => {
                          setReviewsPage(prev => prev + 1);
                          fetchMyReviews(reviewsPage + 1);
                        }}
                        disabled={!reviewsPagination.has_next}
                        className="flex items-center gap-2 px-4 py-2 border border-border-light rounded-lg text-student-primary hover:bg-student-light disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm"
                      >
                        Next
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      <ActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        stats={stats}
      />

      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        user={user}
      />

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileSelect={handleImageUpload}
        uploading={uploading}
        uploadProgress={uploadProgress}
        compressionStatus={compressionStatus}
        rateLimitInfo={rateLimitInfo}
      />

      {/* <Footer /> */}
    </div>
  );
}
