'use client';

import { useState, useEffect } from 'react';

interface ImageModalProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ images, currentIndex, isOpen, onClose }: ImageModalProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          setActiveIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
          break;
        case 'ArrowRight':
          setActiveIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length, onClose]);

  if (!isOpen) return null;

  const nextImage = () => {
    setActiveIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };

  const prevImage = () => {
    setActiveIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative z-10 max-w-4xl max-h-[90vh] mx-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Container */}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          <img
            src={images[activeIndex]}
            alt={`Review image ${activeIndex + 1}`}
            className="w-full max-h-[70vh] object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMDAgMjYwQzE3MSAyNjAgMTQ4IDIzNyAxNDggMjA4QzE0OCAxNzkgMTcxIDE1NiAyMDAgMTU2QzIyOSAxNTYgMjUyIDE3OSAyNTIgMjA4QzI1MiAyMzcgMjI5IDI2MCAyMDAgMjYwWiIgZmlsbD0iI0U1RTdFQiIvPgo8L3N2Zz4K';
            }}
          />
          
          {/* Image Info */}
          <div className="p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Review Image {activeIndex + 1} of {images.length}
              </span>
              
              {/* Thumbnail Navigation */}
              {images.length > 1 && (
                <div className="flex space-x-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveIndex(index)}
                      className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-colors ${
                        index === activeIndex ? 'border-indigo-500' : 'border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
