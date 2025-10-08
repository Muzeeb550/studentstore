'use client';

import Link from 'next/link';

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
  return (
    <Link href={`/categories/${category.id}`} className="group cursor-pointer touch-optimized">
      <div className="category-card">
        <div className="category-image-area">
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="category-icon"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`category-fallback ${category.icon_url ? 'hidden' : 'flex'}`}
          >
            {category.name.charAt(0)}
          </div>
        </div>
        <div className="category-text-area">
          <h4 className="category-title">
            {category.name}
          </h4>
        </div>
        <div className="touch-ripple"></div>
      </div>
    </Link>
  );
}
