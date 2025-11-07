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

  const invalidateProductCaches = useCallback((productId: number) => {
    console.log(`🔄 Invalidating caches for product ${productId}`);
    
    const productCacheKey = `studentstore_product_${productId}`;
    localStorage.removeItem(productCacheKey);
    
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('studentstore_search_')) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    
    localStorage.removeItem('studentstore_cache_products');
    localStorage.removeItem('studentstore_cache_trending');
    
    console.log(`✅ Cleared ${keys.length + 3} cache entries for product ${productId}`);
  }, []);

  const dispatchCacheInvalidation = useCallback((productId: number, type: 'create' | 'update' | 'delete') => {
    window.dispatchEvent(new CustomEvent('adminUpdate', {
      detail: { 
        type: 'review', 
        productId, 
        action: type,
        timestamp: Date.now()
      }
    }));
    
    window.dispatchEvent(new CustomEvent('reviewUpdate', {
      detail: { 
        productId, 
        action: type,
        timestamp: Date.now()
      }
    }));
    
    console.log(`📢 Dispatched ${type} review events for product ${productId}`);
  }, []);

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
      
      await onSubmit(reviewData);
      
      invalidateProductCaches(productId);
      dispatchCacheInvalidation(productId, existingReview ? 'update' : 'create');
      
      console.log(`✅ Review ${existingReview ? 'updated' : 'submitted'} successfully with cache invalidation`);
      
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

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
        
        const compressionProgress = Math.round(((i) / totalFiles) * 40);
        setUploadProgress(compressionProgress);
        setCompressionStatus(`Processing image ${i + 1} of ${totalFiles}...`);

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          alert('Invalid file type. Please select JPG, PNG, GIF, or WebP images.');
          continue;
        }

        if (file.size > 50 * 1024 * 1024) {
          alert(
            `⚠️ File Too Large\n\n` +
            `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB.\n\n` +
            `Maximum file size: 50 MB\n\n` +
            `Please use a smaller image or compress it first.`
          );
          continue;
        }

        if (file.size > 15 * 1024 * 1024) {
          setCompressionStatus(`⏳ Large file detected, compression may take 10-15 seconds...`);
        }

        console.log(`📸 Original image: ${file.name}`);
        console.log(`   Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Type: ${file.type}`);

        let compressedFile = file;
        
        if (file.size > 1024 * 1024) {
          try {
            setCompressionStatus(`Compressing ${file.name}...`);
            
            const compressionOptions = {
              maxSizeMB: file.size > 10 * 1024 * 1024 ? 1.5 : 2,
              maxWidthOrHeight: file.size > 10 * 1024 * 1024 ? 1600 : 1920,
              useWebWorker: true,
              initialQuality: file.size > 10 * 1024 * 1024 ? 0.75 : 0.85,
              fileType: file.type
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
          continue;
        }

        console.log(`✅ Compressed file size OK: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB (within 10MB limit)`);

        const authStartProgress = 40 + Math.round(((i) / totalFiles) * 20);
        setUploadProgress(authStartProgress);
        setCompressionStatus(`Authenticating upload ${i + 1}...`);

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

        const uploadStartProgress = 60 + Math.round(((i) / totalFiles) * 30);
        setUploadProgress(uploadStartProgress);
        setCompressionStatus(`Uploading image ${i + 1}...`);

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

        const finalProgress = Math.round(((i + 1) / totalFiles) * 100);
        setUploadProgress(finalProgress);

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

  const ProgressIndicator = () => (
    <div className="space-y-2">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      {compressionStatus && (
        <p className="text-xs sm:text-sm text-gray-600 text-center px-2 leading-snug">{compressionStatus}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-5 md:p-6 max-w-2xl mx-auto w-full">
      {/* Header - Responsive */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 break-words">
          {existingReview ? '✏️ Edit Your Review' : '✨ Write a Review'}
        </h3>
        <p className="text-sm sm:text-base text-gray-600 break-words">
          Share your experience with <span className="font-semibold text-indigo-600 break-words">{productName}</span>
        </p>
        
        {/* Real-time feedback indicator - Responsive */}
        <div className="mt-2 sm:mt-3 flex items-start sm:items-center text-xs sm:text-sm text-green-600 gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5 sm:mt-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="leading-snug">Your review will update product ratings instantly</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
        {/* Rating Section - Responsive */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Your Rating *
          </label>
          <div className="flex items-center gap-2 sm:gap-4 mb-1 sm:mb-2 overflow-x-auto pb-2">
            <StarRating
              rating={rating}
              interactive={true}
              size="lg"
              onRatingChange={setRating}
              showRatingText={true}
            />
          </div>
          {errors.rating && (
            <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.rating}</p>
          )}
        </div>

        {/* Review Text - Responsive */}
        <div>
          <label htmlFor="reviewText" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            Your Review *
          </label>
          <div className="relative">
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="💭 Share details about your experience with this product. What did you like or dislike? Be specific!"
              rows={5}
              maxLength={1000}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all duration-200 text-sm sm:text-base ${
                errors.reviewText ? 'border-red-500 ring-red-500' : ''
              }`}
              disabled={loading || submitting}
            />
            <div className={`absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs font-medium ${getCharacterCountColor()}`}>
              {reviewText.length}/1000
            </div>
          </div>
          {errors.reviewText && (
            <p className="text-red-500 text-xs sm:text-sm mt-1 flex items-start gap-1">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errors.reviewText}</span>
            </p>
          )}
        </div>

        {/* Image Upload - Responsive */}
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">
            📸 Add Photos (Optional)
          </label>
          
          {/* Upload Progress */}
          {imageUploading && (
            <div className="mb-3 sm:mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                <span className="text-xs sm:text-sm font-medium text-indigo-600">
                  Processing images... {uploadProgress}%
                </span>
                <span className="text-xs sm:text-sm text-gray-500">Please wait</span>
              </div>
              <ProgressIndicator />
            </div>
          )}
          
          {/* Current Images - Responsive Grid */}
          {reviewImages.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
              {reviewImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Review image ${index + 1}`}
                    className="w-full h-16 sm:h-20 md:h-24 object-cover rounded-md sm:rounded-lg border border-gray-200 shadow-sm transition-all duration-200 group-hover:shadow-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                    disabled={imageUploading || submitting}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button - Responsive */}
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
                className={`inline-flex items-center justify-center sm:justify-start px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg font-medium transition-all duration-200 cursor-pointer shadow-sm text-xs sm:text-sm w-full sm:w-auto ${
                  imageUploading || loading || submitting
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {imageUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
                    <span className="truncate">Processing... {uploadProgress}%</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="truncate">📷 Add Photos ({reviewImages.length}/3)</span>
                  </>
                )}
              </label>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                <span className="font-medium block">Supported:</span> JPG, PNG, GIF, WebP . Max 3 photos.<br/>
                <span className="text-indigo-600 font-medium">✨ Smart Compression:</span> Large images auto-compressed to &lt;10MB!
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons - Responsive & Stacking */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 sm:gap-3 md:gap-4 pt-4 sm:pt-5 md:pt-6 border-t border-gray-100 mt-4 sm:mt-5 md:mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || submitting || imageUploading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || submitting || rating === 0 || imageUploading}
            className="w-full sm:w-auto px-4 sm:px-8 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] text-sm sm:text-base"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                <span className="truncate">{existingReview ? 'Updating...' : 'Submitting...'}</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="truncate">{existingReview ? '✏️ Update' : '🚀 Submit'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
