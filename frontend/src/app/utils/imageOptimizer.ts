/**
 * ImageKit Image Optimization Utility
 * Provides client-side URL transformation for optimized image delivery
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  aspectRatio?: string;
  crop?: 'maintain_ratio' | 'force' | 'at_least' | 'at_max';
  focus?: 'auto' | 'center' | 'face' | 'left' | 'right' | 'top' | 'bottom';
  blur?: number;
  dpr?: number;
}

/**
 * Apply ImageKit transformations to a URL
 */
export function applyImageKitTransformations(
  url: string,
  options: ImageTransformOptions = {}
): string {
  if (!url || !url.includes('ik.imagekit.io')) {
    return url; // Return original if not an ImageKit URL
  }

  const {
    width = null,
    height = null,
    quality = 85,
    format = 'auto',
    aspectRatio = null,
    crop = 'maintain_ratio',
    focus = 'auto',
    blur = null,
    dpr = 1
  } = options;

  // Build transformation string
  const transformations: string[] = [];

  if (width) transformations.push(`w-${width}`);
  if (height) transformations.push(`h-${height}`);
  if (aspectRatio) transformations.push(`ar-${aspectRatio}`);
  
  transformations.push(`q-${quality}`);
  transformations.push(`f-${format}`);
  
  if (crop) transformations.push(`c-${crop}`);
  if (focus) transformations.push(`fo-${focus}`);
  if (dpr > 1) transformations.push(`dpr-${dpr}`);
  if (blur) transformations.push(`bl-${blur}`);

  // Parse the URL
  const urlParts = url.split('/');
  const trIndex = urlParts.findIndex(part => part.startsWith('tr:'));
  
  if (trIndex !== -1) {
    // Replace existing transformations
    urlParts[trIndex] = `tr:${transformations.join(',')}`;
  } else {
    // Add transformations before the file path
    const fileIndex = urlParts.findIndex(part => part.includes('studentstore'));
    if (fileIndex !== -1) {
      urlParts.splice(fileIndex, 0, `tr:${transformations.join(',')}`);
    }
  }

  return urlParts.join('/');
}

/**
 * Optimize product image for display
 */
export function optimizeProductImage(
  url: string,
  size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original' = 'medium'
): string {
  const sizeConfig = {
    thumbnail: { width: 200, height: 200, quality: 80 },
    small: { width: 400, height: 400, quality: 85 },
    medium: { width: 800, height: 800, quality: 85 },
    large: { width: 1200, height: 1200, quality: 90 },
    original: { width: undefined, height: undefined, quality: 95 }
  };

  const config = sizeConfig[size];
  
  return applyImageKitTransformations(url, {
    ...config,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'auto'
  });
}

/**
 * Optimize banner image for homepage
 */
export function optimizeBannerImage(
  url: string,
  device: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): string {
  const deviceConfig = {
    mobile: { width: 640, height: 360, quality: 85 },
    tablet: { width: 1024, height: 576, quality: 85 },
    desktop: { width: 1920, height: 1080, quality: 90 }
  };

  const config = deviceConfig[device];
  
  return applyImageKitTransformations(url, {
    ...config,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'center'
  });
}

/**
 * Optimize category icon
 */
export function optimizeCategoryIcon(url: string): string {
  return applyImageKitTransformations(url, {
    width: 300,
    height: 300,
    quality: 90,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'center'
  });
}

/**
 * Optimize profile picture
 */
export function optimizeProfilePicture(
  url: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  const sizeConfig = {
    small: { width: 40, height: 40 },      // Navbar
    medium: { width: 150, height: 150 },   // Profile page
    large: { width: 300, height: 300 }     // Full view
  };

  const config = sizeConfig[size];
  
  return applyImageKitTransformations(url, {
    ...config,
    quality: 90,
    format: 'auto',
    crop: 'maintain_ratio',
    focus: 'face'
  });
}

/**
 * Optimize review image
 */
export function optimizeReviewImage(
  url: string,
  size: 'thumbnail' | 'medium' | 'large' = 'medium'
): string {
  const sizeConfig = {
    thumbnail: { width: 100, height: 100, quality: 80 },
    medium: { width: 600, height: 600, quality: 85 },
    large: { width: 1200, height: 1200, quality: 90 }
  };

  const config = sizeConfig[size];
  
  return applyImageKitTransformations(url, {
    ...config,
    format: 'auto',
    crop: 'force',
    focus: 'center'
  });
}

/**
 * Generate responsive srcset for an image
 * Returns srcset string for use in <img> tags
 */
export function generateResponsiveSrcset(
  url: string,
  type: 'product' | 'banner' | 'category' = 'product'
): string {
  if (!url || !url.includes('ik.imagekit.io')) {
    return '';
  }

  const configs = {
    product: [
      { width: 200, descriptor: '200w' },
      { width: 400, descriptor: '400w' },
      { width: 800, descriptor: '800w' },
      { width: 1200, descriptor: '1200w' }
    ],
    banner: [
      { width: 640, descriptor: '640w' },
      { width: 1024, descriptor: '1024w' },
      { width: 1920, descriptor: '1920w' }
    ],
    category: [
      { width: 150, descriptor: '150w' },
      { width: 300, descriptor: '300w' },
      { width: 600, descriptor: '600w' }
    ]
  };

  const config = configs[type];
  
  const srcset = config.map(({ width, descriptor }) => {
    const transformedUrl = applyImageKitTransformations(url, {
      width,
      quality: 85,
      format: 'auto',
      crop: 'maintain_ratio'
    });
    return `${transformedUrl} ${descriptor}`;
  });

  return srcset.join(', ');
}

/**
 * Get optimized image URL based on screen size
 * Useful for responsive images
 */
export function getResponsiveImageUrl(
  url: string,
  screenWidth: number,
  type: 'product' | 'banner' | 'category' = 'product'
): string {
  if (!url) return url;

  // Determine optimal width based on screen size and type
  let optimalWidth: number;

  if (type === 'banner') {
    if (screenWidth <= 640) optimalWidth = 640;
    else if (screenWidth <= 1024) optimalWidth = 1024;
    else optimalWidth = 1920;
  } else if (type === 'category') {
    if (screenWidth <= 640) optimalWidth = 150;
    else if (screenWidth <= 1024) optimalWidth = 300;
    else optimalWidth = 600;
  } else { // product
    if (screenWidth <= 640) optimalWidth = 400;
    else if (screenWidth <= 1024) optimalWidth = 800;
    else optimalWidth = 1200;
  }

  return applyImageKitTransformations(url, {
    width: optimalWidth,
    quality: 85,
    format: 'auto',
    crop: 'maintain_ratio'
  });
}

/**
 * Detect device pixel ratio for retina displays
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  return window.devicePixelRatio || 1;
}

/**
 * Get optimized image with retina support
 */
export function getRetinaOptimizedUrl(
  url: string,
  width: number,
  quality: number = 85
): string {
  const dpr = getDevicePixelRatio();
  
  return applyImageKitTransformations(url, {
    width: Math.round(width * dpr),
    quality,
    format: 'auto',
    dpr: dpr > 1 ? 2 : 1
  });
}

/**
 * Parse image URLs from JSON string (for database fields)
 */
export function parseImageUrls(imageUrlsJson: string): string[] {
  try {
    const urls = JSON.parse(imageUrlsJson);
    return Array.isArray(urls) ? urls : [];
  } catch {
    return [];
  }
}

/**
 * Get first image from parsed URLs or return placeholder
 */
export function getFirstImageOrPlaceholder(
  imageUrlsJson: string,
  placeholder: string = '/placeholder-product.jpg'
): string {
  const urls = parseImageUrls(imageUrlsJson);
  return urls[0] || placeholder;
}

/**
 * Optimize image URL based on viewport size (React hook compatible)
 */
export function useOptimizedImageUrl(
  url: string,
  type: 'product' | 'banner' | 'category' = 'product'
): string {
  if (typeof window === 'undefined') {
    return optimizeProductImage(url, 'medium');
  }

  return getResponsiveImageUrl(url, window.innerWidth, type);
}
