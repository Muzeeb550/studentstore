'use client';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  uploadProgress: number;
  compressionStatus: string;
  rateLimitInfo: {
    remaining: number;
    resetTime: Date | null;
  };
}

export default function UploadModal({
  isOpen,
  onClose,
  onFileSelect,
  uploading,
  uploadProgress,
  compressionStatus,
  rateLimitInfo
}: UploadModalProps) {
  if (!isOpen) return null;

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-white rounded-2xl max-w-md w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-student-blue to-student-green px-6 py-4 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Upload Profile Picture</span>
            </h2>
            <button
              onClick={onClose}
              disabled={uploading}
              className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Rate Limit Warning */}
            {getRateLimitMessage() && (
              <div className="p-3 border border-student-orange/30 bg-student-orange/10 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-student-orange flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-student-primary">
                    {getRateLimitMessage()}
                  </p>
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-student-light rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-student-blue to-student-green h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {compressionStatus && (
                  <p className="text-sm text-student-secondary text-center">
                    {compressionStatus}
                  </p>
                )}
              </div>
            )}

            {/* File Input */}
            <div className="border-2 border-dashed border-student-blue/30 rounded-xl p-8 text-center bg-student-blue/5 hover:bg-student-blue/10 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={onFileSelect}
                disabled={uploading || (rateLimitInfo.remaining <= 0)}
                className="hidden"
                id="upload-input"
              />
              <label
                htmlFor="upload-input"
                className={`cursor-pointer ${
                  uploading || (rateLimitInfo.remaining <= 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-student-blue/20 rounded-full flex items-center justify-center">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-student-blue"></div>
                    ) : (
                      <svg className="w-8 h-8 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-student-primary mb-1">
                      {uploading ? `Uploading... ${uploadProgress}%` : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-student-secondary">
                      JPG, PNG, GIF, WebP (max 50MB)
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Info Box */}
            <div className="bg-student-light rounded-lg p-4 border border-border-light">
              <h4 className="font-semibold text-student-primary mb-2 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-student-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Upload Guidelines
              </h4>
              <ul className="text-xs text-student-secondary space-y-1">
                <li>✨ Images are automatically compressed</li>
                <li>🔒 Rate limited to 5 uploads per hour</li>
                <li>📐 Best results with square images</li>
                <li>⚡ Optimized for fast loading</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-2xl flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-border-light rounded-lg text-student-primary hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
