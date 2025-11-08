'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';

interface RecommendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecommendModal({ isOpen, onClose }: RecommendModalProps) {
  const [productName, setProductName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [productLink, setProductLink] = useState('');
  const [price, setPrice] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionStatus, setCompressionStatus] = useState('');
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime: Date | null }>({
    remaining: 5,
    resetTime: null,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);
    setCompressionStatus('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const newImageUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Accept any size, but provide compression feedback
        if (!file.type.startsWith('image/')) {
          setError(`${file.name} is not an image file.`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          setCompressionStatus(`⏳ Compressing large image ${file.name}, please wait...`);
        }

        // Compress only if larger than 500KB to balance quality and upload time
        let compressedFile = file;
        if (file.size > 500 * 1024) {
          try {
            const compressionOptions = {
              maxSizeMB: file.size > 20 * 1024 * 1024 ? 1 : 2,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.7,
              fileType: file.type,
              onProgress: (percentage: number) => setUploadProgress(percentage),
            };

            compressedFile = await imageCompression(file, compressionOptions);

            setCompressionStatus(`Compressed ${file.name} to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);

          } catch (compErr) {
            console.warn(`Compression failed for ${file.name}, using original file:`, compErr);
            compressedFile = file; // fallback
            setCompressionStatus('Compression failed, using original image');
          }
        } else {
          setCompressionStatus(`${file.name} is already optimized`);
        }

        // Check compressed size limit: max 20MB
        if (compressedFile.size > 20 * 1024 * 1024) {
          setError(`Unable to upload ${file.name}: exceeds 20MB limit after compression.`);
          continue;
        }

        setUploadProgress(50);
        setCompressionStatus('Authenticating upload...');

        // Get fresh ImageKit auth params for each image
        const authResponse = await fetch(`${apiUrl}/api/feedback/imagekit-auth`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!authResponse.ok) throw new Error('Failed to get ImageKit auth');

        const authResult = await authResponse.json();
        if (authResult.status !== 'success') throw new Error('Invalid auth response');

        setUploadProgress(70);

        const formData = new FormData();
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

        formData.append('file', compressedFile);
        formData.append('fileName', `recommendation_${timestamp}_${i}_${sanitizedFileName}`);
        formData.append('folder', '/studentstore/recommendations');
        formData.append('token', authResult.token);
        formData.append('signature', authResult.signature);
        formData.append('expire', authResult.expire.toString());
        formData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');

        console.log(`Uploading ${sanitizedFileName} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);

        const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (uploadResult.url) {
          newImageUrls.push(uploadResult.url);
          console.log('Upload successful:', uploadResult.url);
        } else {
          console.error('Upload failed:', uploadResult);
          throw new Error(uploadResult.message || 'Upload failed');
        }
      }

      if (newImageUrls.length > 0) {
        setUploadedImages([...uploadedImages, ...newImageUrls]);
        setError('');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      setError(error.message || 'Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setTimeout(() => setCompressionStatus(''), 2500);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim()) {
      setError('Product name is required');
      return;
    }

    if (productName.trim().length < 3) {
      setError('Product name must be at least 3 characters');
      return;
    }

    if (!reviewText.trim() || reviewText.trim().length < 10) {
      setError('Review must be at least 10 characters');
      return;
    }

    if (!productLink.trim()) {
      setError('Product link is required');
      return;
    }

    try {
      new URL(productLink);
    } catch {
      setError('Please enter a valid product URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/feedback/recommend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_name: productName.trim(),
          review_text: reviewText.trim(),
          product_link: productLink.trim(),
          product_images: uploadedImages,
          price: price ? parseFloat(price) : null,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setProductName('');
          setReviewText('');
          setProductLink('');
          setPrice('');
          setUploadedImages([]);
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.message || 'Failed to submit recommendation');
      }
    } catch (error) {
      setError('Failed to submit recommendation. Please try again.');
      console.error('Submit recommendation error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎁</div>
          <h2 className="text-2xl font-bold text-student-primary mb-2">Recommend a Product</h2>
          <p className="text-student-secondary text-sm">Help other students discover great products!</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
            <p className="text-green-800 font-semibold">🎉 Thank you for your recommendation!</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">1. Product Name *</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Sony WH-1000XM5 Headphones"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-transparent"
              maxLength={255}
            />
          </div>

          {/* Review */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">2. Your Review *</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="How has this product helped you? What makes it useful for students?"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-transparent resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 10 characters</p>
          </div>

          {/* Product Link */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">3. Where did you buy it? *</label>
            <input
              type="url"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="https://www.amazon.in/dp/..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Paste product link from Amazon, Flipkart, etc.</p>
          </div>

          {/* Product Images */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">4. Product Images (optional)</label>
            <p className="text-xs text-gray-500 mb-2">Upload up to 3 images (max 20MB each)</p>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Upload ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {uploadedImages.length < 3 && (
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-student-blue hover:bg-blue-50 transition">
                  {uploading ? (
                    <div className="flex items-center justify-center gap-2 text-student-blue">
                      <svg
                        className="animate-spin h-5 w-5"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl mb-1">📸</div>
                      <p className="text-sm text-gray-600">Click to upload images</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {3 - uploadedImages.length}{' '}
                        {uploadedImages.length === 2 ? 'image' : 'images'} remaining
                      </p>
                    </>
                  )}
                </div>
              </label>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">5. Approx. Price (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2999"
                className="w-full border border-gray-300 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-transparent"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
              disabled={loading || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-student-blue to-student-green text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Recommendation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
