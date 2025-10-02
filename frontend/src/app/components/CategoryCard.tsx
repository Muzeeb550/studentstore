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
    <Link href={`/categories/${category.id}`} className="group cursor-pointer category-touch-optimized">
      <div className="category-card-research">
        <div className="category-image-area">
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="category-icon-research object-contain transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`
              category-fallback-research
              bg-gradient-to-br from-student-blue to-student-green 
              rounded-xl flex items-center justify-center 
              text-white font-semibold
              transition-transform duration-300 group-hover:scale-110
              shadow-sm
              ${category.icon_url ? 'hidden' : 'flex'}
            `}
            style={{ display: category.icon_url ? 'none' : 'flex' }}
          >
            {category.name.charAt(0)}
          </div>
        </div>
        <div className="category-text-area">
          <h4 className="category-title-research font-medium text-student-primary group-hover:text-student-blue transition-colors duration-200 text-center">
            {category.name}
          </h4>
        </div>
        <div className="category-touch-ripple absolute inset-0 bg-student-blue/3 rounded-xl opacity-0 group-active:opacity-100 transition-opacity duration-200 md:hidden"></div>
      </div>
    </Link>
  );
}
