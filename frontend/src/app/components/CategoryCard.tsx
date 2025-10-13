'use client';

import Link from 'next/link';
import { useState } from 'react';

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
              src={category.icon_url}
              alt=""               // decorative; accessible name comes from aria-label
              aria-hidden="true"
              className="category-icon"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="category-fallback flex">
              {initial}
            </div>
          )}
        </div>

        {/* Keep or hide the text label based on design needs.
            To hide: add style={{ display: 'none' }} or a utility class. */}
        <div className="category-text-area">
          <h4 className="category-title">{category.name}</h4>
        </div>

        <div className="touch-ripple"></div>
      </div>
    </Link>
  );
}
