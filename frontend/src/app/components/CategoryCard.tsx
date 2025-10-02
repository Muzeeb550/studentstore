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
    <Link href={`/categories/${category.id}`} className="group cursor-pointer mobile-touch-category">
      <div className="category-card-uniform mobile-category-card">
        {/* 90% Image Container - Large and Prominent */}
        <div className="category-image-section">
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="category-icon-large object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Large Fallback Icon */}
          <div 
            className={`
              category-fallback-large
              bg-gradient-to-br from-student-blue to-student-green 
              rounded-2xl flex items-center justify-center 
              text-white font-semibold
              transition-transform duration-300 group-hover:scale-105
              shadow-md
              ${category.icon_url ? 'hidden' : 'flex'}
            `}
            style={{ display: category.icon_url ? 'none' : 'flex' }}
          >
            {category.name.charAt(0)}
          </div>
        </div>
        
        {/* 10% Text Section - Minimal and Clean */}
        <div className="category-text-section">
          <h4 className="category-title-uniform font-medium text-student-primary group-hover:text-student-blue transition-colors duration-200 text-center">
            {category.name}
          </h4>
        </div>

        {/* Mobile Touch Ripple Effect */}
        <div className="mobile-touch-ripple absolute inset-0 bg-student-blue/5 rounded-2xl opacity-0 group-active:opacity-100 transition-opacity duration-150 md:hidden"></div>
      </div>
    </Link>
  );
}
