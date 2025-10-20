import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudentStore - Student Marketplace',
    short_name: 'StudentStore',
    description: 'Discover student-verified products, deals, and reviews for campus life. Find the best products recommended by fellow students.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['shopping', 'education'],
    
    // ✅ App shortcuts (long-press app icon)
    // shortcuts: [
    //   {
    //     name: 'Browse Products',
    //     short_name: 'Products',
    //     description: 'Browse all student products',
    //     url: '/',
    //     icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
    //   },
    //   {
    //     name: 'My Wishlist',
    //     short_name: 'Wishlist',
    //     description: 'View saved products',
    //     url: '/wishlist',
    //     icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
    //   },
    //   {
    //     name: 'Search',
    //     short_name: 'Search',
    //     description: 'Search for products',
    //     url: '/search',
    //     icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
    //   },
    // ],
  }
}
