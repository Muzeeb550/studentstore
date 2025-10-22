'use client';

import { useState, useEffect, useCallback } from 'react';
import StarRating from './StarRating';
import imageCompression from 'browser-image-compression';

interface ReviewFormProps {
  productId: number;
  productName: string;
  existingReview?: {
    id: number;
    rating: number;
    review_text: string;
    review_images: string[];
  };
  onSubmit: (reviewData: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ReviewForm({
  productId,
  productName,
  existingReview,
  onSubmit,
  onCancel,
  loading = false
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const [reviewImages, setReviewImages] = useState<string[]>(existingReview?.review_images || []);
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // 🚀 ENHANCED: Loading states with compression tracking
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [compressionStatus, setCompressionStatus] = useState<string>('');

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (rating === 0) {
      newErrors.rating = 'Please select a rating';
    }

    if (reviewText.trim().length < 10) {
      newErrors.reviewText = 'Review must be at least 10 characters long';
    }

    if (reviewText.trim().length > 1000) {
      newErrors.reviewText = 'Review must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🚀 Cache invalidation helper
  const invalidateProductCaches = useCallback((productId: number) => {
    console.log(`🔄 Invalidating caches for product ${productId}`);
    
    // Clear product details cache
    const productCacheKey = `studentstore_product_${productId}`;
    localStorage.removeItem(productCacheKey);
    
    // Clear all search caches (product ratings changed)
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('studentstore_search_')) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    
    // Clear homepage caches (featured products might be affected)
    localStorage.removeItem('studentstore_cache_products');
    localStorage.removeItem('studentstore_cache_trending');
    
    console.log(`✅ Cleared ${keys.length + 3} cache entries for product ${productId}`);
  }, []);

  // 🚀 Dispatch cache invalidation events
  const dispatchCacheInvalidation = useCallback((productId: number, type: 'create' | 'update' | 'delete') => {
    // Dispatch admin update event for other components
    window.dispatchEvent(new CustomEvent('adminUpdate', {
      detail: { 
        type: 'review', 
        productId, 
        action: type,
        timestamp: Date.now()
      }
    }));
    
    // Dispatch specific review update event
    window.dispatchEvent(new CustomEvent('reviewUpdate', {
      detail: { 
        productId, 
        action: type,
        timestamp: Date.now()
      }
    }));
    
    console.log(`📢 Dispatched ${type} review events for product ${productId}`);
  }, []);

  // 🚀 Handle form submission with cache invalidation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const reviewData = {
      product_id: productId,
      rating,
      review_text: reviewText.trim(),
      review_images: reviewImages
    };

    setSubmitting(true);

    try {
      console.log(`📝 Submitting ${existingReview ? 'updated' : 'new'} review for product ${productId}`);
      
      // Submit the review
      await onSubmit(reviewData);
      
      // Immediate cache invalidation
      invalidateProductCaches(productId);
      
      // Dispatch events for real-time updates
      dispatchCacheInvalidation(productId, existingReview ? 'update' : 'create');
      
      console.log(`✅ Review ${existingReview ? 'updated' : 'submitted'} successfully with cache invalidation`);
      
      // Show success notification
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showToast', {
          detail: {
            type: 'success',
            message: `Review ${existingReview ? 'updated' : 'submitted'} successfully! Rating and count updated instantly.`,
            duration: 5000
          }
        });
        window.dispatchEvent(event);
      }
      
    } catch (error) {
      console.error('❌ Review submission error:', error);
      
      // Show error notification
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('showToast', {
          detail: {
            type: 'error',
            message: 'Failed to submit review. Please try again.',
            duration: 5000
          }
        });
        window.dispatchEvent(event);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 🚀 UPDATED: Image upload with 10MB LIMIT and CLIENT-SIDE COMPRESSION
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Limit to 3 images max
    if (reviewImages.length + files.length > 3) {
      alert('Maximum 3 images allowed per review');
      return;
    }

    setImageUploading(true);
    setUploadProgress(0);
    setCompressionStatus('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const totalFiles = files.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];
        
        // Update progress for compression phase (0-40%)
        const compressionProgress = Math.round(((i) / totalFiles) * 40);
        setUploadProgress(compressionProgress);
        setCompressionStatus(`Processing image ${i + 1} of ${totalFiles}...`);

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          alert('Invalid file type. Please select JPG, PNG, GIF, or WebP images.');
          continue;
        }

        // 🔥 NEW: Check if file is absurdly large (> 50MB) - reject before compression
        if (file.size > 50 * 1024 * 1024) {
          alert(
            `⚠️ File Too Large\n\n` +
            `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB.\n\n` +
            `Maximum file size: 50 MB\n\n` +
            `Please use a smaller image or compress it first.`
          );
          continue;
        }

        // 🔥 NEW: Warn about very large files (15-50MB)
        if (file.size > 15 * 1024 * 1024) {
          setCompressionStatus(`⏳ Large file detected, compression may take 10-15 seconds...`);
        }

        // Log original file info
        console.log(`📸 Original image: ${file.name}`);
        console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Type: ${file.type}`);

        // 🚀 CLIENT-SIDE COMPRESSION
        let compressedFile = file;
        
        // Only compress if file is larger than 1MB
        if (file.size > 1024 * 1024) {
          try {
            setCompressionStatus(`Compressing ${file.name}...`);
            
            // 🔥 ENHANCED: More aggressive compression for very large files (>10MB)
            const compressionOptions = {
              maxSizeMB: file.size > 10 * 1024 * 1024 ? 1.5 : 2,  // 1.5MB for huge files, 2MB otherwise
              maxWidthOrHeight: file.size > 10 * 1024 * 1024 ? 1600 : 1920, // Smaller resolution for huge files
              useWebWorker: true,        // Non-blocking compression
              initialQuality: file.size > 10 * 1024 * 1024 ? 0.75 : 0.85, // Lower quality for huge files
              fileType: file.type        // Preserve original format
            };

            console.log(`🔄 Compressing ${file.name}...`);
            
            compressedFile = await imageCompression(file, compressionOptions);
            
            const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
            const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
            const savingsPercent = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1);
            
            console.log(`✅ Compression successful!`);
            console.log(`   Original: ${originalSizeMB} MB`);
            console.log(`   Compressed: ${compressedSizeMB} MB`);
            console.log(`   Savings: ${savingsPercent}%`);
            
            setCompressionStatus(`Compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${savingsPercent}% saved)`);
            
          } catch (compressionError) {
            console.warn(`⚠️ Compression failed for ${file.name}, using original:`, compressionError);
            setCompressionStatus(`Compression failed, checking size...`);
            compressedFile = file;
          }
        } else {
          console.log(`✅ Image is already small (${(file.size / 1024 / 1024).toFixed(2)} MB), skipping compression`);
          setCompressionStatus(`Image already optimized`);
        }

        // 🔥 UPDATED: Validate compressed file size - NOW 10MB LIMIT!
        const maxSize = 10 * 1024 * 1024; // 10MB
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
          continue;
        }

        // ✅ Size is good! Log it
        console.log(`✅ Compressed file size OK: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB (within 10MB limit)`);

        // Update progress for authentication phase (40-60%)
        const authStartProgress = 40 + Math.round(((i) / totalFiles) * 20);
        setUploadProgress(authStartProgress);
        setCompressionStatus(`Authenticating upload ${i + 1}...`);

        // 🚀 Retry logic with exponential backoff
        let authResult;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            console.log(`📤 Authenticating upload ${i + 1}/${totalFiles} (attempt ${retryCount + 1})`);
            
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const authResponse = await fetch(`${apiUrl}/api/users/imagekit-auth?usage=review&priority=high`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (authResponse.status === 429) {
              const retryAfter = authResponse.headers.get('Retry-After') || '60';
              const waitTime = Math.min(parseInt(retryAfter) * 1000, 10000);
              
              if (retryCount === maxRetries - 1) {
                throw new Error(`Review image upload limit reached. Please wait a few minutes and try again.`);
              }
              
              console.log(`⏳ Rate limited, waiting ${waitTime/1000} seconds...`);
              setCompressionStatus(`Rate limited, waiting ${waitTime/1000}s...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              retryCount++;
              continue;
            }

            if (!authResponse.ok) {
              throw new Error(`Authentication failed: ${authResponse.status}`);
            }

            authResult = await authResponse.json();
            console.log(`✅ ImageKit auth successful for review image ${i + 1}`);
            break;

          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error;
            }
            
            const backoffTime = Math.pow(2, retryCount) * 1000;
            console.log(`⏳ Auth attempt ${retryCount} failed, retrying in ${backoffTime/1000}s...`);
            setCompressionStatus(`Retry ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }

        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error('Upload configuration missing. Please contact support.');
        }

        // Update progress for upload phase (60-100%)
        const uploadStartProgress = 60 + Math.round(((i) / totalFiles) * 30);
        setUploadProgress(uploadStartProgress);
        setCompressionStatus(`Uploading image ${i + 1}...`);

        // Upload compressed file
        const uploadData = new FormData();
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        
        uploadData.append('file', compressedFile);
        uploadData.append('fileName', `review_${productId}_${timestamp}_${sanitizedFileName}`);
        uploadData.append('folder', '/studentstore/reviews');
        uploadData.append('token', authResult.token);
        uploadData.append('signature', authResult.signature);
        uploadData.append('expire', authResult.expire.toString());
        uploadData.append('publicKey', publicKey);
        
        // Enhanced tags with compression info
        const compressionTag = compressedFile.size < file.size ? 'compressed' : 'original';
        uploadData.append('tags', `product_${productId},review_image,user_upload,uploaded_${timestamp},${compressionTag}`);
        
        uploadData.append('responseFields', 'tags,url,thumbnailUrl,fileId,name,size,filePath');

        console.log(`📤 Uploading to ImageKit: ${sanitizedFileName} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);

        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: uploadData
        });

        let uploadResult;
        try {
          uploadResult = await uploadResponse.json();
        } catch (parseError) {
          console.error('❌ Failed to parse ImageKit response:', parseError);
          throw new Error('Invalid response from image upload service');
        }

        // Enhanced error handling
        if (uploadResponse.ok && uploadResult.url) {
          setReviewImages(prev => [...prev, uploadResult.url]);
          console.log(`✅ Image ${i + 1}/${totalFiles} uploaded successfully:`, {
            url: uploadResult.url,
            fileId: uploadResult.fileId,
            name: uploadResult.name,
            finalSize: `${(uploadResult.size / 1024).toFixed(0)} KB`
          });
          setCompressionStatus(`Upload ${i + 1} complete!`);
        } else {
          console.error('❌ ImageKit upload failed:', {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            result: uploadResult
          });
          
          let errorMessage = 'Upload to ImageKit failed';
          if (uploadResult?.message) {
            errorMessage = uploadResult.message;
          } else if (uploadResult?.error) {
            errorMessage = uploadResult.error;
          } else if (!uploadResponse.ok) {
            errorMessage = `Upload failed with status ${uploadResponse.status}`;
          }
          
          throw new Error(errorMessage);
        }

        // Update final progress for this file
        const finalProgress = Math.round(((i + 1) / totalFiles) * 100);
        setUploadProgress(finalProgress);

        // Small delay between uploads
        if (i < totalFiles - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`🎉 All ${totalFiles} review images compressed and uploaded successfully! (10MB max per image)`);
      setCompressionStatus('All images uploaded successfully! ✅');

    } catch (error) {
      console.error('❌ Image upload error:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Enhanced error handling with user-friendly messages
      if (errorMessage.includes('Invalid custom metadata')) {
        alert('📸 Image upload configuration error. Please try again or contact support.');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        alert(`📸 Upload limit reached!\n\nPlease wait a few minutes before uploading more review images.\n\nNote: Review images have a generous limit of 30 uploads per hour.`);
      } else if (errorMessage.includes('Authentication failed')) {
        alert('🔒 Authentication failed. Please try signing in again.');
      } else if (errorMessage.includes('Upload configuration missing')) {
        alert('⚙️ Upload system configuration error. Please contact support.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        alert('🌐 Network error. Please check your internet connection and try again.');
      } else if (errorMessage.includes('Invalid response from image upload')) {
        alert('🔧 Image upload service returned invalid response. Please try again.');
      } else if (errorMessage.includes('too large after compression') || errorMessage.includes('Unable to compress')) {
        alert(`📸 The selected image is too large even after compression.\n\nPlease choose a smaller photo or try a different image.`);
      } else {
        alert(`❌ Failed to upload images: ${errorMessage}`);
      }
      
      setCompressionStatus('Upload failed ❌');
    } finally {
      setImageUploading(false);
      setUploadProgress(0);
      // Keep compression status visible for 3 seconds
      setTimeout(() => setCompressionStatus(''), 3000);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setReviewImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const getCharacterCountColor = () => {
    if (reviewText.length > 900) return 'text-red-500';
    if (reviewText.length > 800) return 'text-yellow-500';
    return 'text-gray-500';
  };

  // 🚀 Enhanced progress indicator with compression status
  const ProgressIndicator = () => (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      {compressionStatus && (
        <p className="text-xs text-gray-600 text-center">{compressionStatus}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {existingReview ? '✏️ Edit Your Review' : '✨ Write a Review'}
        </h3>
        <p className="text-gray-600">
          Share your experience with <span className="font-semibold text-indigo-600">{productName}</span>
        </p>
        
        {/* Real-time feedback indicator */}
        <div className="mt-2 flex items-center text-sm text-green-600">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Your review will update product ratings instantly</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Your Rating *
          </label>
          <div className="flex items-center space-x-4 mb-2">
            <StarRating
              rating={rating}
              interactive={true}
              size="lg"
              onRatingChange={setRating}
              showRatingText={true}
            />
          </div>
          {errors.rating && (
            <p className="text-red-500 text-sm mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Review Text */}
        <div>
          <label htmlFor="reviewText" className="block text-sm font-semibold text-gray-900 mb-3">
            Your Review *
          </label>
          <div className="relative">
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="💭 Share details about your experience with this product. What did you like or dislike? How did it help with your studies? Be specific to help other students!"
              rows={6}
              maxLength={1000}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all duration-200 ${
                errors.reviewText ? 'border-red-500 ring-red-500' : ''
              }`}
              disabled={loading || submitting}
            />
            <div className={`absolute bottom-3 right-3 text-xs font-medium ${getCharacterCountColor()}`}>
              {reviewText.length}/1000
            </div>
          </div>
          {errors.reviewText && (
            <p className="text-red-500 text-sm mt-1 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.reviewText}
            </p>
          )}
        </div>

        {/* Image Upload - Enhanced with 10MB Compression */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            📸 Add Photos (Optional)
          </label>
          
          {/* Upload Progress with Compression Status */}
          {imageUploading && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-indigo-600">
                  Processing images... {uploadProgress}%
                </span>
                <span className="text-sm text-gray-500">Please wait</span>
              </div>
              <ProgressIndicator />
            </div>
          )}
          
          {/* Current Images */}
          {reviewImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {reviewImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Review image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 shadow-sm transition-all duration-200 group-hover:shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                    disabled={imageUploading || submitting}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {reviewImages.length < 3 && (
            <div>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={handleImageUpload}
                disabled={imageUploading || loading || submitting}
                className="hidden"
                id="review-images"
              />
              <label
                htmlFor="review-images"
                className={`inline-flex items-center px-4 py-3 border border-gray-300 rounded-lg font-medium transition-all duration-200 cursor-pointer shadow-sm ${
                  imageUploading || loading || submitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {imageUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
                    Processing... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    📷 Add Photos ({reviewImages.length}/3)
                  </>
                )}
              </label>
              <p className="text-sm text-gray-500 mt-2">
                <span className="font-medium">Supported:</span> JPG, PNG, GIF, WebP up to 50MB. Max 3 photos.<br/>
                <span className="text-indigo-600 font-medium">✨ Smart Compression:</span> Large images automatically compressed to under 10MB!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || submitting || imageUploading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || submitting || rating === 0 || imageUploading}
            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                {existingReview ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {existingReview ? '✏️ Update Review' : '🚀 Submit Review'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
