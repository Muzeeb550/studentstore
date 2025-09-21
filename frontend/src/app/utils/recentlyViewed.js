// Recently Viewed Products Management
export const addToRecentlyViewed = (product) => {
  try {
    // Get existing recently viewed products
    const existing = JSON.parse(localStorage.getItem('studentstore_recently_viewed') || '[]');
    
    // Create new entry
    const newEntry = {
      product: product,
      viewedAt: Date.now()
    };
    
    // Remove if already exists (to avoid duplicates)
    const filtered = existing.filter(item => item.product.id !== product.id);
    
    // Add new entry at the beginning
    const updated = [newEntry, ...filtered];
    
    // Keep only last 10 items
    const limited = updated.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('studentstore_recently_viewed', JSON.stringify(limited));
    
    console.log('✅ Product added to recently viewed:', product.name);
    
    return limited;
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
    return [];
  }
};

export const getRecentlyViewed = () => {
  try {
    const stored = localStorage.getItem('studentstore_recently_viewed');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Sort by most recent and ensure valid data
      return parsed
        .filter(item => item.product && item.product.id) // Filter out invalid entries
        .sort((a, b) => b.viewedAt - a.viewedAt)
        .slice(0, 10);
    }
    return [];
  } catch (error) {
    console.error('Error getting recently viewed:', error);
    return [];
  }
};

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem('studentstore_recently_viewed');
    console.log('✅ Recently viewed cleared');
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
  }
};
