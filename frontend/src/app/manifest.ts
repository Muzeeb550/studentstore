import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudentStore - Smart Shopping for Students',
    short_name: 'StudentStore',
    description: 'Your ultimate shopping companion for student life. Discover the best products with reviews and recommendations.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    icons: [
  // All sizes with 'any' purpose
  {
    src: '/web-app-manifest-72x72.png',
    sizes: '72x72',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-96x96.png',
    sizes: '96x96',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-128x128.png',
    sizes: '128x128',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-144x144.png',
    sizes: '144x144',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-152x152.png',
    sizes: '152x152',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-384x384.png',
    sizes: '384x384',
    type: 'image/png',
    purpose: 'any'
  },
  {
    src: '/web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any'
  },
  // Maskable versions (for adaptive icons)
  {
    src: '/web-app-manifest-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'maskable'
  },
  {
    src: '/web-app-manifest-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable'
  }
],
    categories: ['shopping', 'education', 'lifestyle'],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: 'Browse Products',
        short_name: 'Products',
        description: 'Browse all student products',
        url: '/products',
        icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }]
      },
      {
        name: 'My Wishlist',
        short_name: 'Wishlist',
        description: 'View your wishlist',
        url: '/wishlist',
        icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }]
      }
    ]
  }
}
