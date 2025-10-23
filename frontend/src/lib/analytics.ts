// Track custom events
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Pre-defined events for StudentStore
export const analytics = {
  // Product events
  viewProduct: (productId: string, productName: string) => {
    trackEvent('view_product', 'Product', `${productName} (${productId})`);
  },

  searchProduct: (searchTerm: string) => {
    trackEvent('search', 'Search', searchTerm);
  },

  addToWishlist: (productId: string) => {
    trackEvent('add_to_wishlist', 'Engagement', productId);
  },

  // User events
  signUp: (method: string) => {
    trackEvent('sign_up', 'User', method);
  },

  login: (method: string) => {
    trackEvent('login', 'User', method);
  },

  // Navigation events
  clickCategory: (categoryName: string) => {
    trackEvent('select_content', 'Navigation', `Category: ${categoryName}`);
  },
};
