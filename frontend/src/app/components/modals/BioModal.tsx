'use client';

import { useState, useEffect } from 'react';

interface BioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBio: string;
  onSave: (bio: string) => Promise<void>;
}

export default function BioModal({ isOpen, onClose, currentBio, onSave }: BioModalProps) {
  const [bioEdit, setBioEdit] = useState<string>('');
  const [bioSaving, setBioSaving] = useState(false);
  const [bioError, setBioError] = useState<string>('');

  // Update bioEdit when modal opens or currentBio changes
  useEffect(() => {
    if (isOpen) {
      setBioEdit(currentBio || '');
      setBioError('');
    }
  }, [isOpen, currentBio]);

  const handleSave = async () => {
    setBioSaving(true);
    setBioError('');

    try {
      const trimmedBio = bioEdit.trim();

      if (trimmedBio.length > 300) {
        setBioError(`Bio is too long (${trimmedBio.length}/300 characters)`);
        setBioSaving(false);
        return;
      }

      await onSave(trimmedBio);
      onClose();
    } catch (error: any) {
      console.error('Error saving bio:', error);
      setBioError(error.message || 'Failed to update bio. Please try again.');
    } finally {
      setBioSaving(false);
    }
  };

  const handleClose = () => {
    if (!bioSaving) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-fade-in">
          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={bioSaving}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-student-primary mb-1">
              {currentBio ? 'Edit Bio' : 'Add Bio'}
            </h3>
            <p className="text-sm text-student-secondary">
              Tell others about yourself (max 300 characters)
              <br />
              <span className="text-xs text-gray-500">💡 Tip: Press Enter for new lines</span>
            </p>
          </div>

          {/* Bio Textarea */}
          <div className="mb-4">
            <textarea
              value={bioEdit}
              onChange={(e) => setBioEdit(e.target.value)}
              placeholder="e.g., Computer Science student passionate about technology and innovation..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-student-blue focus:border-transparent resize-none text-sm"
              rows={6}
              maxLength={300}
              disabled={bioSaving}
            />
            
            {/* Character Counter */}
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs font-medium ${
                bioEdit.length > 300 
                  ? 'text-red-600' 
                  : bioEdit.length > 250 
                  ? 'text-orange-600' 
                  : 'text-gray-500'
              }`}>
                {bioEdit.length}/300 characters
              </span>
              
              {bioEdit.length > 0 && (
                <button
                  onClick={() => setBioEdit('')}
                  className="text-xs text-student-blue hover:text-student-green transition-colors"
                  disabled={bioSaving}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {bioError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{bioError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={bioSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={bioSaving || bioEdit.length > 300}
              className="flex-1 px-4 py-2 bg-student-blue text-white rounded-lg hover:bg-student-blue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {bioSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                'Save Bio'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
