'use client';

import Link from 'next/link';
import { useState } from 'react';
import { optimizeCategoryIcon } from '../utils/imageOptimizer';

interface Category {
  id: number;
  name: string;
  description: string;
  icon_url: string;
}

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!category.icon_url && !imgError;
  const initial = category.name?.trim()?.charAt(0)?.toUpperCase() || '?';

  // ✅ OPTIMIZED: Get optimized category icon (300x300, 90% quality, WebP)
  const getOptimizedIcon = (iconUrl: string) => {
    if (!iconUrl) return '';
    return optimizeCategoryIcon(iconUrl);
  };

  return (
    <Link
      href={`/categories/${category.id}`}
      className="group cursor-pointer touch-optimized block"
      aria-label={`Category: ${category.name}`}
    >
      {/* ✅ MOBILE: Full image, no padding */}
      <div className="md:hidden">
        <div className="bg-student-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
          {showImage ? (
            <img
              src={getOptimizedIcon(category.icon_url)}
              alt=""
              aria-hidden="true"
              className="w-full h-40 sm:h-48 object-cover object-center" // ✅ ADDED: object-center
              loading="lazy"
              decoding="async"
              width={300}
              height={300}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-40 sm:h-48 bg-gradient-to-br from-student-blue/20 to-student-green/20 flex items-center justify-center text-4xl font-bold text-student-blue">
              {initial}
            </div>
          )}
        </div>
        
        {/* Category name below card - MOBILE */}
        <h4 className="category-title mt-2 text-center font-bold text-student-primary text-sm sm:text-base"> {/* ✅ CHANGED: font-semibold → font-bold */}
          {category.name}
        </h4>
      </div>


      {/* ✅ DESKTOP: Original design with padding */}
      <div className="hidden md:block">
        <div className="category-card">
          <div className="category-image-area">
            {showImage ? (
              <img
                src={getOptimizedIcon(category.icon_url)}
                alt=""
                aria-hidden="true"
                className="category-icon"
                loading="lazy"
                decoding="async"
                width={300}
                height={300}
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="category-fallback flex">
                {initial}
              </div>
            )}
          </div>

          <div className="category-text-area">
            <h4 className="category-title">{category.name}</h4>
          </div>

          <div className="touch-ripple"></div>
        </div>
      </div>
    </Link>
  );
}
