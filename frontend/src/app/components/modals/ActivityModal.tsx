'use client';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    wishlist_count: number;
    products_viewed: number;
    total_reviews: number;
    average_rating_given: number;
    days_since_joining: number;
  } | null;
}

export default function ActivityModal({ isOpen, onClose, stats }: ActivityModalProps) {
  if (!isOpen || !stats) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-2xl font-bold text-student-primary flex items-center gap-2">
              <span>📈</span>
              <span>Activity</span>
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Wishlist */}
              <div className="bg-student-orange/10 border border-student-orange/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-student-orange">💖 Wishlist</h3>
                  <div className="w-10 h-10 bg-student-orange/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-student-primary">{stats.wishlist_count}</p>
                <p className="text-sm text-student-secondary mt-1">Saved products</p>
              </div>

              {/* Reviews */}
              <div className="bg-student-green/10 border border-student-green/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-student-green">⭐ Reviews</h3>
                  <div className="w-10 h-10 bg-student-green/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-student-primary">{stats.total_reviews}</p>
                <p className="text-sm text-student-secondary mt-1">Reviews written</p>
              </div>

              {/* Avg Rating */}
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-warning">📊 Avg Rating</h3>
                  <div className="w-10 h-10 bg-warning/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-student-primary">
                  {stats.total_reviews > 0 ? stats.average_rating_given.toFixed(1) : '0.0'}
                </p>
                <p className="text-sm text-student-secondary mt-1">Out of 5.0 stars</p>
              </div>

              {/* Days Active */}
              <div className="bg-student-blue/10 border border-student-blue/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-student-blue">📅 Member</h3>
                  <div className="w-10 h-10 bg-student-blue/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-student-primary">{stats.days_since_joining}</p>
                <p className="text-sm text-student-secondary mt-1">Days strong</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-student-light rounded-xl p-4 border border-border-light">
              <h3 className="font-medium text-student-primary mb-3">🚀 Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="/wishlist"
                  className="flex items-center gap-2 p-3 bg-white border border-border-light rounded-lg hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm font-medium">View Wishlist</span>
                </a>
                <a
                  href="/my-reviews"
                  className="flex items-center gap-2 p-3 bg-white border border-border-light rounded-lg hover:shadow-md transition-all"
                >
                  <svg className="w-5 h-5 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-sm font-medium">My Reviews</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-student-blue text-white rounded-xl font-semibold hover:bg-student-blue/90 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
