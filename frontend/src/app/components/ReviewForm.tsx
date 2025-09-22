'use client';

import { useState, useEffect } from 'react';
import StarRating from './StarRating';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const reviewData = {
      product_id: productId,
      rating,
      review_text: reviewText.trim(),
      review_images: reviewImages
    };

    try {
      await onSubmit(reviewData);
    } catch (error) {
      console.error('Review submission error:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Limit to 3 images max
    if (reviewImages.length + files.length > 3) {
      alert('Maximum 3 images allowed per review');
      return;
    }

    setImageUploading(true);

    try {
      const token = localStorage.getItem('studentstore_token');
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
          alert('Invalid file type. Please select JPG, PNG, GIF, or WebP images.');
          continue;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          alert(`File ${file.name} is too large. Please select images smaller than 5MB.`);
          continue;
        }

        // IMPROVED: Retry logic for ImageKit authentication with usage parameter
        let authResult;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            console.log(`Attempting ImageKit auth for review images (attempt ${retryCount + 1})`);
            
            // UPDATED: Add usage=review parameter for higher rate limits
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const authResponse = await fetch(`${apiUrl}/api/users/imagekit-auth?usage=review`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (authResponse.status === 429) {
              // Rate limited - wait and retry
              const retryAfter = authResponse.headers.get('Retry-After') || '60';
              const waitTime = parseInt(retryAfter) * 1000;
              
              if (retryCount === maxRetries - 1) {
                throw new Error(`Review image upload limit reached. Please wait ${Math.ceil(waitTime / 60000)} minutes before uploading more images.`);
              }
              
              console.log(`Rate limited, waiting ${waitTime/1000} seconds...`);
              await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 10000))); // Wait max 10 seconds
              retryCount++;
              continue;
            }

            if (!authResponse.ok) {
              throw new Error(`Authentication failed: ${authResponse.status} - ${authResponse.statusText}`);
            }

            authResult = await authResponse.json();
            console.log('✅ ImageKit auth successful for review images');
            break; // Success, exit retry loop

          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error;
            }
            console.log(`Auth attempt ${retryCount} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        }

        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (!publicKey) {
          throw new Error('Upload configuration missing. Please contact support.');
        }

        // Upload to ImageKit
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('fileName', `review_${productId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`);
        uploadData.append('folder', '/studentstore/reviews');
        uploadData.append('token', authResult.token);
        uploadData.append('signature', authResult.signature);
        uploadData.append('expire', authResult.expire.toString());
        uploadData.append('publicKey', publicKey);
        uploadData.append('tags', `product_${productId},review_image`);

        console.log(`📤 Uploading image ${i + 1}/${files.length} to ImageKit...`);

        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: uploadData
        });

        const uploadResult = await uploadResponse.json();

        if (uploadResponse.ok && uploadResult.url) {
          setReviewImages(prev => [...prev, uploadResult.url]);
          console.log(`✅ Image ${i + 1} uploaded successfully: ${uploadResult.url}`);
        } else {
          console.error('❌ ImageKit upload failed:', uploadResult);
          throw new Error(uploadResult.message || 'Upload to ImageKit failed');
        }

        // Add a small delay between uploads to avoid overwhelming the server
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between uploads
        }
      }

      console.log(`🎉 All ${files.length} images uploaded successfully!`);

    } catch (error) {
      console.error('Image upload error:', error);
      
      // IMPROVED: Better error message handling
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      // Handle specific error cases
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        alert(`Upload limit reached. Please wait a few minutes before uploading more images.\n\nNote: Review images have a generous limit of 30 uploads per hour.`);
      } else if (errorMessage.includes('Authentication failed')) {
        alert('Authentication failed. Please try signing in again.');
      } else if (errorMessage.includes('Upload configuration missing')) {
        alert('Upload system configuration error. Please contact support.');
      } else {
        alert(`Failed to upload images: ${errorMessage}`);
      }
    } finally {
      setImageUploading(false);
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

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {existingReview ? 'Edit Your Review' : 'Write a Review'}
        </h3>
        <p className="text-gray-600">
          Share your experience with <span className="font-semibold text-indigo-600">{productName}</span>
        </p>
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
              placeholder="Share details about your experience with this product. What did you like or dislike? How did it help with your studies?"
              rows={6}
              maxLength={1000}
              className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                errors.reviewText ? 'border-red-500' : ''
              }`}
              disabled={loading}
            />
            <div className={`absolute bottom-3 right-3 text-xs ${getCharacterCountColor()}`}>
              {reviewText.length}/1000
            </div>
          </div>
          {errors.reviewText && (
            <p className="text-red-500 text-sm mt-1">{errors.reviewText}</p>
          )}
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Add Photos (Optional)
          </label>
          
          {/* Current Images */}
          {reviewImages.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {reviewImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Review image ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
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
                disabled={imageUploading || loading}
                className="hidden"
                id="review-images"
              />
              <label
                htmlFor="review-images"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                  imageUploading || loading
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {imageUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Photos ({reviewImages.length}/3)
                  </>
                )}
              </label>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG, GIF, WebP up to 5MB each. Max 3 photos. 
                <span className="text-indigo-600 font-medium"> (30 uploads per hour allowed)</span>
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                {existingReview ? 'Updating...' : 'Submitting...'}
              </>
            ) : (
              existingReview ? 'Update Review' : 'Submit Review'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
