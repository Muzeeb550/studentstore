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

// Detect if user is using PWA
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
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

  // PWA events
  pwa: {
    // User sees install prompt
    promptShown: () => {
      trackEvent('pwa_prompt_shown', 'PWA', 'Install banner displayed');
    },
    
    // User clicks "Install"
    installClicked: () => {
      trackEvent('pwa_install_clicked', 'PWA', 'User clicked install');
    },
    
    // User dismisses prompt
    promptDismissed: () => {
      trackEvent('pwa_prompt_dismissed', 'PWA', 'User dismissed prompt');
    },
    
    // Install completed
    installCompleted: () => {
      trackEvent('pwa_installed', 'PWA', 'App installed successfully');
    },
    
    // App launched from home screen
    appLaunched: () => {
      if (isPWA()) {
        trackEvent('pwa_launched', 'PWA', 'Opened from home screen');
      }
    },

    // Track session type on app load
    trackSessionType: () => {
      const sessionType = isPWA() ? 'PWA' : 'Browser';
      trackEvent('session_started', 'Engagement', `Via ${sessionType}`);
    },
  },
};
