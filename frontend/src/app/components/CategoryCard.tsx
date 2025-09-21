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
    <Link href={`/categories/${category.id}`} className="group cursor-pointer">
      <div className="category-card">
        {/* LARGER Icon Container - MUCH MORE PROMINENT */}
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-student-blue/10 to-student-green/10 rounded-3xl flex items-center justify-center group-hover:from-student-blue/20 group-hover:to-student-green/20 transition-all duration-300 group-hover:scale-110 shadow-lg group-hover:shadow-xl">
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="w-16 h-16 object-contain transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                // Hide image and show fallback
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          
          {/* LARGER Fallback initial */}
          <div 
            className={`w-16 h-16 bg-gradient-to-br from-student-blue to-student-green rounded-2xl flex items-center justify-center text-white font-bold text-2xl transition-transform duration-300 group-hover:scale-110 shadow-inner ${category.icon_url ? 'hidden' : 'flex'}`}
            style={{ display: category.icon_url ? 'none' : 'flex' }}
          >
            {category.name.charAt(0)}
          </div>
        </div>
        
        {/* Content - Adjusted spacing for larger icon */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-student-primary mb-3 group-hover:text-student-blue transition-colors duration-200 text-center text-lg">
              {category.name}
            </h4>
            <p className="text-sm text-student-secondary leading-relaxed line-clamp-2 text-center mb-4">
              {category.description}
            </p>
          </div>
          
          {/* Hover action */}
          <div className="mt-auto">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
              <div className="inline-flex items-center text-student-green text-sm font-semibold mx-auto">
                Explore Category
                <svg className="ml-1 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Student-friendly indicator */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-student-orange text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
            🎓 Popular
          </div>
        </div>
      </div>
    </Link>
  );
}
