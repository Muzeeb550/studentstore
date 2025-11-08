'use client';

import { useState, useEffect, useCallback } from 'react';

interface RateAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RateAppModal({ isOpen, onClose }: RateAppModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [existingRating, setExistingRating] = useState<any>(null);

  // Fetch existing rating once when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingExisting(true);
      fetchExistingRating().finally(() => setLoadingExisting(false));
    } else {
      // Reset all states when modal closes to avoid flicker
      setRating(0);
      setHoverRating(0);
      setReviewText('');
      setExistingRating(null);
      setError('');
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  const fetchExistingRating = useCallback(async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/feedback/my-rating`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        // Only update if data differs to prevent flicker
        if (
          result.data.rating !== rating ||
          result.data.review_text !== reviewText
        ) {
          setExistingRating(result.data);
          setRating(result.data.rating);
          setReviewText(result.data.review_text || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch existing rating:', error);
    }
  }, [rating, reviewText]);

  const handleStarClick = useCallback((star: number) => {
    setRating(star);
  }, []);

  const handleStarEnter = useCallback((star: number) => {
    setHoverRating(star);
  }, []);

  const handleStarLeave = useCallback(() => {
    setHoverRating(0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) throw new Error('Not authenticated');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/feedback/rating`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          review_text: reviewText.trim() || null,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          // Reset form fields after close
          setRating(0);
          setHoverRating(0);
          setReviewText('');
          setSuccess(false);
          setExistingRating(null);
        }, 2000);
      } else {
        setError(result.message || 'Failed to submit rating');
      }
    } catch (error) {
      setError('Failed to submit rating. Please try again.');
      console.error('Submit rating error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (stars: number) => {
    switch (stars) {
      case 1:
        return { text: 'Very Bad', emoji: '😟', color: 'text-red-500' };
      case 2:
        return { text: 'Bad', emoji: '😕', color: 'text-orange-500' };
      case 3:
        return { text: 'Good', emoji: '😊', color: 'text-yellow-500' };
      case 4:
        return { text: 'Great', emoji: '😃', color: 'text-blue-500' };
      case 5:
        return { text: 'Fantastic', emoji: '🤩', color: 'text-green-500' };
      default:
        return { text: '', emoji: '', color: '' };
    }
  };

  const currentRating = hoverRating || rating;
  const ratingInfo = getRatingLabel(currentRating);

  if (!isOpen) return null;

  if (loadingExisting) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl text-center"
          onClick={(e) => e.stopPropagation()}
        >
          Loading rating...
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⭐</div>
          <h2 className="text-2xl font-bold text-student-primary mb-2">
            {existingRating ? 'Update Your Rating' : 'Rate StudentStore'}
          </h2>
          <p className="text-student-secondary text-sm">
            {existingRating ? 'Change your rating anytime!' : 'How would you rate your experience?'}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
            <p className="text-green-800 font-semibold">🎉 Thank you for your feedback!</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Rating Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">Your Rating *</label>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarEnter(star)}
                  onMouseLeave={() => handleStarLeave()}
                  className="transition-transform hover:scale-125 focus:outline-none"
                >
                  <svg
                    className={`w-12 h-12 ${star <= currentRating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Rating Label */}
            {currentRating > 0 && (
              <div className="text-center">
                <div className="text-4xl mb-2">{ratingInfo.emoji}</div>
                <p className={`text-lg font-bold ${ratingInfo.color}`}>{ratingInfo.text}</p>
              </div>
            )}
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tell us more (optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts - app speed, features, improvements needed..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-student-blue focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">{reviewText.length}/500 characters</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || rating === 0}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-student-blue to-student-green text-white rounded-lg font-bold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
              ) : existingRating ? (
                'Update Rating'
              ) : (
                'Submit Rating'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
