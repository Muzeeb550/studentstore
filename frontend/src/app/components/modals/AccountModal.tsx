'use client';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    name?: string;
    display_name?: string;
    email: string;
    role: string;
  } | null;
}

export default function AccountModal({ isOpen, onClose, user }: AccountModalProps) {
  if (!isOpen || !user) return null;

  const getDisplayName = () => {
    return user.name || user.display_name || user.email.split('@')[0] || 'Student';
  };

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
              <span>🔐</span>
              <span>Account</span>
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
            {/* Account Information */}
            <div className="bg-student-light rounded-xl p-5 border border-border-light">
              <h3 className="font-semibold text-student-primary mb-4 flex items-center gap-2 text-lg">
                <svg className="w-5 h-5 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border-light">
                  <span className="text-student-secondary text-sm">Name:</span>
                  <span className="font-medium text-student-primary text-sm">{getDisplayName()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-light">
                  <span className="text-student-secondary text-sm">Email:</span>
                  <span className="font-medium text-student-primary text-sm break-all text-right ml-4">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-light">
                  <span className="text-student-secondary text-sm">Account Type:</span>
                  <span className={`font-medium text-sm ${user.role === 'admin' ? 'text-student-orange' : 'text-student-blue'}`}>
                    {user.role === 'admin' ? '👑 Admin' : '🎓 Student'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border-light">
                  <span className="text-student-secondary text-sm">Student ID:</span>
                  <span className="font-medium text-student-primary text-sm">#{user.id}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-student-secondary text-sm">Login Method:</span>
                  <span className="font-medium text-student-green text-sm">🔐 Google OAuth</span>
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="bg-student-green/10 border border-student-green/20 rounded-xl p-5">
              <h3 className="font-semibold text-student-primary mb-4 flex items-center gap-2 text-lg">
                <svg className="w-5 h-5 text-student-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Security Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-student-green">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">Account is secure and verified</span>
                </div>
                <div className="flex items-start gap-2 text-student-green">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-sm">Rate limiting active for uploads</span>
                </div>
                <div className="flex items-start gap-2 text-student-green">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm">All uploads are compressed & validated</span>
                </div>
                <div className="flex items-start gap-2 text-student-green">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-sm">Google OAuth authentication enabled</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-student-blue/10 border border-student-blue/20 rounded-xl p-5">
              <h3 className="font-semibold text-student-primary mb-3 flex items-center gap-2 text-lg">
                <svg className="w-5 h-5 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Privacy & Data
              </h3>
              <p className="text-sm text-student-secondary leading-relaxed">
                Your data is securely stored and only used to provide StudentStore services. 
                We never share your personal information with third parties. 
                Your profile, posts, and reviews are visible to other students to foster community trust.
              </p>
            </div>

            {/* Account Actions */}
            <div className="bg-student-light rounded-xl p-5 border border-border-light">
              <h3 className="font-semibold text-student-primary mb-4 text-lg">Account Actions</h3>
              <div className="space-y-3">
                <a
                  href="/dashboard"
                  className="flex items-center justify-between p-3 bg-white border border-border-light rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-student-blue/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-student-primary text-sm">View Dashboard</p>
                      <p className="text-xs text-student-secondary">See your complete stats</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                {user.role === 'admin' && (
                  <a
                    href="/admin"
                    className="flex items-center justify-between p-3 bg-white border border-border-light rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-student-orange/10 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-student-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-student-primary text-sm">Admin Panel</p>
                        <p className="text-xs text-student-secondary">Manage content</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-student-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                )}
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
