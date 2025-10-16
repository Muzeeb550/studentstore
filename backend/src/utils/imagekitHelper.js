/**
 * ImageKit URL Transformation Helper
 * Provides optimized image URLs with quality, format, and size transformations
 */

/**
 * Apply ImageKit transformations to a URL
 * @param {string} url - Original ImageKit URL
 * @param {object} options - Transformation options
 * @returns {string} - Transformed URL
 */
function applyImageKitTransformations(url, options = {}) {
    if (!url || !url.includes('ik.imagekit.io')) {
        return url; // Return original if not an ImageKit URL
    }

    const {
        width = null,
        height = null,
        quality = 85,           // Default 85% quality (good balance)
        format = 'auto',        // Auto-detect WebP/AVIF support
        aspectRatio = null,
        crop = 'maintain_ratio',
        focus = 'auto',
        blur = null,
        dpr = 1                 // Device Pixel Ratio (1 or 2 for retina)
    } = options;

    // Build transformation string
    const transformations = [];

    // Size transformations
    if (width) transformations.push(`w-${width}`);
    if (height) transformations.push(`h-${height}`);
    if (aspectRatio) transformations.push(`ar-${aspectRatio}`);
    
    // Quality and format
    transformations.push(`q-${quality}`);
    transformations.push(`f-${format}`);
    
    // Cropping and focus
    if (crop) transformations.push(`c-${crop}`);
    if (focus) transformations.push(`fo-${focus}`);
    
    // DPR for retina displays
    if (dpr > 1) transformations.push(`dpr-${dpr}`);
    
    // Effects
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
 * Optimize product images (for product cards, listings)
 */
function optimizeProductImage(url, size = 'medium') {
    const sizeConfig = {
        'thumbnail': { width: 200, height: 200, quality: 80 },
        'small': { width: 400, height: 400, quality: 85 },
        'medium': { width: 800, height: 800, quality: 85 },
        'large': { width: 1200, height: 1200, quality: 90 },
        'original': { width: null, height: null, quality: 95 }
    };

    const config = sizeConfig[size] || sizeConfig.medium;
    
    return applyImageKitTransformations(url, {
        ...config,
        format: 'auto',
        crop: 'maintain_ratio',
        focus: 'auto'
    });
}

/**
 * Optimize banner images (homepage banners)
 */
function optimizeBannerImage(url, device = 'desktop') {
    const deviceConfig = {
        'mobile': { width: 640, height: 360, quality: 85 },
        'tablet': { width: 1024, height: 576, quality: 85 },
        'desktop': { width: 1920, height: 1080, quality: 90 }
    };

    const config = deviceConfig[device] || deviceConfig.desktop;
    
    return applyImageKitTransformations(url, {
        ...config,
        format: 'auto',
        crop: 'maintain_ratio',
        focus: 'center'
    });
}

/**
 * Optimize category icon images
 */
function optimizeCategoryIcon(url) {
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
 * Optimize profile pictures (circular avatars)
 */
function optimizeProfilePicture(url, size = 'medium') {
    const sizeConfig = {
        'small': { width: 40, height: 40 },      // Navbar
        'medium': { width: 150, height: 150 },   // Profile page
        'large': { width: 300, height: 300 }     // Full view
    };

    const config = sizeConfig[size] || sizeConfig.medium;
    
    return applyImageKitTransformations(url, {
        ...config,
        quality: 90,
        format: 'auto',
        crop: 'maintain_ratio',
        focus: 'face'  // ImageKit's face detection
    });
}

/**
 * Optimize review images
 */
function optimizeReviewImage(url, size = 'medium') {
    const sizeConfig = {
        'thumbnail': { width: 100, height: 100, quality: 80 },
        'medium': { width: 600, height: 600, quality: 85 },
        'large': { width: 1200, height: 1200, quality: 90 }
    };

    const config = sizeConfig[size] || sizeConfig.medium;
    
    return applyImageKitTransformations(url, {
        ...config,
        format: 'auto',
        crop: 'maintain_ratio',
        focus: 'auto'
    });
}

/**
 * Generate responsive srcset for an image
 * Returns multiple URLs at different sizes for responsive images
 */
function generateResponsiveSrcset(url, type = 'product') {
    if (!url || !url.includes('ik.imagekit.io')) {
        return null;
    }

    const configs = {
        'product': [
            { width: 200, descriptor: '200w' },
            { width: 400, descriptor: '400w' },
            { width: 800, descriptor: '800w' },
            { width: 1200, descriptor: '1200w' }
        ],
        'banner': [
            { width: 640, descriptor: '640w' },
            { width: 1024, descriptor: '1024w' },
            { width: 1920, descriptor: '1920w' }
        ],
        'category': [
            { width: 150, descriptor: '150w' },
            { width: 300, descriptor: '300w' },
            { width: 600, descriptor: '600w' }
        ]
    };

    const config = configs[type] || configs.product;
    
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
 * Add transformations to uploaded image URL
 * This should be called right after upload to store optimized URL
 */
function addDefaultTransformations(url, imageType = 'product') {
    if (!url || !url.includes('ik.imagekit.io')) {
        return url;
    }

    const transformationConfig = {
        'product': { quality: 85, format: 'auto' },
        'banner': { quality: 90, format: 'auto' },
        'category': { quality: 90, format: 'auto' },
        'profile': { quality: 90, format: 'auto' },
        'review': { quality: 85, format: 'auto' }
    };

    const config = transformationConfig[imageType] || transformationConfig.product;
    
    return applyImageKitTransformations(url, config);
}

module.exports = {
    applyImageKitTransformations,
    optimizeProductImage,
    optimizeBannerImage,
    optimizeCategoryIcon,
    optimizeProfilePicture,
    optimizeReviewImage,
    generateResponsiveSrcset,
    addDefaultTransformations
};
