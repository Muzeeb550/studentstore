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
    <div className="group cursor-pointer">
      <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 text-center group-hover:scale-105 transform">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors duration-300">
          {category.icon_url ? (
            <img 
              src={category.icon_url} 
              alt={category.name}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {category.name.charAt(0)}
            </div>
          )}
        </div>
        
        {/* Content */}
        <h4 className="font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors duration-200">
          {category.name}
        </h4>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
          {category.description}
        </p>
        
        {/* Hover arrow */}
        <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="inline-flex items-center text-indigo-600 text-sm font-medium">
            Explore
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
