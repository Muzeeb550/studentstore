'use client';

import React, { useState, useRef } from 'react';

interface ImageUploadWidgetProps {
  onUploadComplete: (urls: string[]) => void;
  maxFiles?: number;
}

export default function ImageUploadWidget({ onUploadComplete, maxFiles = 5 }: ImageUploadWidgetProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > maxFiles) {
      setError(`Maximum ${maxFiles} images allowed`);
      return;
    }

    // Validate file types and sizes
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        setError(`File "${file.name}" is not an image`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError(`File "${file.name}" is larger than 5MB`);
        return;
      }
    }

    setUploading(true);
    setError(null);
    setUploadProgress([]);

    try {
      const token = localStorage.getItem('studentstore_token');
      const uploadedUrls: string[] = [];

      // Upload each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress(prev => [...prev, `Uploading ${file.name}...`]);

        try {
          // Get ImageKit authentication
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (!authResponse.ok) {
            throw new Error('Failed to get upload authentication');
          }

          const authResult = await authResponse.json();

          // Upload to ImageKit
          const uploadData = new FormData();
          const timestamp = Date.now();
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          
          uploadData.append('file', file);
          uploadData.append('fileName', `post_${timestamp}_${sanitizedFileName}`);
          uploadData.append('folder', '/studentstore/posts');
          uploadData.append('token', authResult.token);
          uploadData.append('signature', authResult.signature);
          uploadData.append('expire', authResult.expire.toString());
          uploadData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');

          const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
            method: 'POST',
            body: uploadData
          });

          const uploadResult = await uploadResponse.json();

          if (uploadResponse.ok && uploadResult.url) {
            uploadedUrls.push(uploadResult.url);
            setUploadProgress(prev => [...prev, `✅ ${file.name} uploaded`]);
          } else {
            throw new Error(uploadResult.message || 'Upload failed');
          }
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          setUploadProgress(prev => [...prev, `❌ ${file.name} failed`]);
          // Continue with other files
        }
      }

      if (uploadedUrls.length > 0) {
        onUploadComplete(uploadedUrls);
        setUploadProgress(prev => [...prev, `✅ ${uploadedUrls.length} image(s) uploaded successfully!`]);
      } else {
        setError('All uploads failed. Please try again.');
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError((err as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setUploadProgress([]);
      }, 3000);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Uploading...
            </>
          ) : (
            <>
              📤 Upload Images
            </>
          )}
        </button>
        <span className="text-sm text-gray-500">
          Max {maxFiles} images • JPG, PNG, WEBP (5MB each)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="mt-3 space-y-1">
          {uploadProgress.map((msg, idx) => (
            <div key={idx} className="text-xs text-gray-600">
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
