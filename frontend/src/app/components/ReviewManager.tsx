'use client';

import { useState, useEffect } from 'react';
import ReviewForm from './ReviewForm';

interface ReviewManagerProps {
  productId: number;
  productName: string;
  onReviewSubmitted?: () => void;
}

interface UserReview {
  id: number;
  rating: number;
  review_text: string;
  review_images: string[];
}

export default function ReviewManager({ productId, productName, onReviewSubmitted }: ReviewManagerProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Get current user from localStorage
    const storedUser = localStorage.getItem('studentstore_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        checkUserReviews(user.id);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [productId]);

  const checkUserReviews = async (userId: number) => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const response = await fetch('http://localhost:5000/api/reviews/my-reviews', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Count how many reviews user has for this product
        const productReviews = result.data.reviews.filter(
          (review: any) => review.product_id === productId
        );
        
        console.log(`User has ${productReviews.length} reviews for this product`);
        
        // Don't set userReview anymore - users can write multiple reviews
        // Always allow new reviews to be written
      }
    } catch (error) {
      console.error('Error checking user reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (reviewData: any) => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('studentstore_token');
      // Always create new reviews, never update existing ones
      const response = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Review submitted successfully!');
        setShowForm(false);
        
        // Notify parent component
        if (onReviewSubmitted) onReviewSubmitted();
      } else {
        alert(result.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Sign in to write a review</h3>
        <p className="text-gray-600 mb-6">Share your experience with other students</p>
        <button 
          onClick={() => window.location.href = 'http://localhost:5000/auth/google'}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <ReviewForm
          productId={productId}
          productName={productName}
          onSubmit={handleReviewSubmit}
          onCancel={() => setShowForm(false)}
          loading={submitting}
        />
      </div>
    );
  }

  // Always show "Write a Review" button - users can write unlimited reviews
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="text-center space-y-4">
        <h3 className="text-xl font-bold text-gray-900">Share Your Experience</h3>
        <p className="text-gray-600">Help other students by writing a review for this product</p>
        <div className="text-center">
          <div className="text-2xl mb-2">⭐</div>
          <p className="text-sm text-gray-500 mb-4">You can write multiple reviews to share different experiences!</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Write a Review
        </button>
      </div>
    </div>
  );
}
