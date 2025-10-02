'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size for conditional rendering
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Mobile below 768px
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <Link href={`/categories/${category.id}`} className="group cursor-pointer mobile-touch-category">
      <div className="category-card mobile-category-card">
        {/* Mobile-First Large Image Container - 80% */}
        <div className="mobile-large-icon-container">
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="mobile-large-category-icon object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* Large Mobile-Optimized Fallback */}
          <div 
            className={`
              mobile-large-category-fallback
              bg-gradient-to-br from-student-blue to-student-green 
              rounded-2xl sm:rounded-3xl 
              flex items-center justify-center 
              text-white font-bold 
              transition-transform duration-300 group-hover:scale-105
              shadow-lg
              ${category.icon_url ? 'hidden' : 'flex'}
            `}
            style={{ display: category.icon_url ? 'none' : 'flex' }}
          >
            {category.name.charAt(0)}
          </div>
        </div>
        
        {/* Mobile vs Desktop Content - 20% */}
        <div className="mobile-category-text-section">
          {/* Category Name - Mobile Optimized Large Text */}
          <h4 className="mobile-large-category-title font-bold text-student-primary group-hover:text-student-blue transition-colors duration-200 text-center">
            {category.name}
          </h4>
          
          {/* Description - Hidden on Mobile, Shown on Desktop */}
          {!isMobile && (
            <p className="text-sm text-student-secondary leading-relaxed line-clamp-2 text-center mb-4 desktop-only-description">
              {category.description}
            </p>
          )}
          
          {/* Desktop-Only Hover Action */}
          {!isMobile && (
            <div className="mt-auto desktop-only-action">
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="inline-flex items-center text-student-green text-sm font-semibold mx-auto">
                  Explore Category
                  <svg className="ml-1 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Desktop-Only Popularity Badge */}
        {!isMobile && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 desktop-only-badge">
            <div className="bg-student-orange text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
              🎓 Popular
            </div>
          </div>
        )}

        {/* Mobile Touch Ripple Effect */}
        <div className="mobile-touch-ripple absolute inset-0 bg-student-blue/5 rounded-2xl opacity-0 group-active:opacity-100 transition-opacity duration-150 md:hidden"></div>
      </div>
    </Link>
  );
}
