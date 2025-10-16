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
      className="group cursor-pointer touch-optimized"
      aria-label={`Category: ${category.name}`}
    >
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
    </Link>
  );
}
