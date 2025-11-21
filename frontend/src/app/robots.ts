import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',          // Block all admin pages
          '/api/',            // Block API routes
          '/wishlist',        // Private wishlist page
          '/bookmarks',        // Private bookmark page
          '/my-reviews',      // Private reviews page
          '/dashboard',       // Private dashboard page
          '/profile$',        // Private profile base page only (not profile/[id])
        ],
      },
    ],
    sitemap: 'https://studentstore-zeta.vercel.app/sitemap.xml',
  }
}
