const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/adminAuth');
const rateLimit = require('express-rate-limit');

// ============================================
// RATE LIMITING
// ============================================
const chatLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 messages per 15 minutes
  keyGenerator: (req) => `user:${req.user.id}`,
  message: {
    status: 'error',
    message: 'Too many messages. Please try again later.',
    code: 'CHAT_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// CATEGORY KEYWORD MAPPING (All 21 Categories)
// ============================================
const categoryKeywords = {
  'Laptops': ['laptop', 'laptops', 'notebook', 'computer', 'macbook', 'dell', 'hp', 'asus', 'lenovo'],
  'Laptop tables': ['laptop table', 'laptop desk', 'laptop stand desk', 'table', 'desk'],
  'Earbuds': ['earbud', 'earbuds', 'wireless earbud', 'airpods', 'buds', 'in-ear', 'earphone', 'ear bud', 'ear buds'],
  'Crocs': ['croc', 'crocs', 'footwear', 'shoe', 'comfortable shoe', 'casual shoe'],
  'Laptop Bags': ['laptop bag', 'laptop backpack', 'laptop case', 'bag', 'backpack', 'case'],
  'Running Shoes': ['running shoe', 'shoes', 'sneaker', 'shoe', 'sports shoe', 'athletic shoe'],
  'Laptop cooling pads': ['cooling pad', 'laptop cooler', 'cooling pad laptop', 'cooler'],
  'Keyboard': ['keyboard', 'mechanical keyboard', 'wireless keyboard', 'laptop keyboard'],
  'Mouse': ['mouse', 'computer mouse', 'wireless mouse', 'gaming mouse'],
  'Laptop skin': ['laptop skin', 'skin', 'sticker', 'laptop sticker'],
  'USB HUBS': ['usb hub', 'hub', 'usb ports', 'usb adapter', 'usb'],
  'Blue Light Blocking Glasses': ['blue light glasses', 'glasses', 'blue light blocking', 'eye care'],
  'Webcam': ['webcam', 'webcamera', 'camera', 'web camera', 'usb camera'],
  'College Bags/Backpacks': ['college bag', 'backpack', 'bag', 'school bag', 'college backpack'],
  'Powerbank': ['powerbank', 'power bank', 'battery bank', 'mobile charger', 'portable charger'],
  'Mobile Stand': ['mobile stand', 'phone stand', 'stand', 'holder'],
  'smart watches': ['smart watch', 'smartwatch', 'watch', 'fitness watch'],
  'Wired Earphones': ['wired earphone', 'earphone','earphones', 'wired earbud', 'ear phone', 'ear phones', 'wired ear phone'],
  'Head Phones': ['headphone', 'headphones', 'over-ear', 'headset', 'head phone', 'head phones'],
  'Calculator': ['calculator', 'scientific calculator', 'engineering calculator' , 'casio'],
  'Pen Stands': ['pen stand', 'pen holder','penstand' , 'stand', 'desk organizer']
};

// ============================================
// HELPER: Extract Category from User Input
// ============================================
function extractCategory(userMessage) {
  // ✅ Normalize: remove extra spaces and special characters
  const normalizedMessage = userMessage
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .trim();
  
  const categoryArray = Object.entries(categoryKeywords);
  let bestMatch = null;
  let bestMatchLength = 0;
  
  for (const [categoryName, keywords] of categoryArray) {
    for (const keyword of keywords) {
      // ✅ Normalize keywords too
      const normalizedKeyword = keyword
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      
      // Match exact word or substring
      if (normalizedMessage.includes(normalizedKeyword)) {
        // Prioritize LONGER keyword matches (more specific)
        if (normalizedKeyword.length > bestMatchLength) {
          bestMatch = categoryName;
          bestMatchLength = normalizedKeyword.length;
        }
      }
    }
  }
  
  return bestMatch;
}



// ============================================
// HELPER: Extract Price Constraints
// ============================================
function extractPriceConstraints(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Pattern: "under X" or "below X"
  const underMatch = userMessage.match(/under\s+(\d+)/i) || 
                     userMessage.match(/below\s+(\d+)/i) ||
                     userMessage.match(/less than\s+(\d+)/i);
  
  if (underMatch) {
    return {
      maxPrice: parseInt(underMatch[1]),
      minPrice: null
    };
  }
  
  // Pattern: "between X-Y" or "X to Y" or "X - Y"
  const betweenMatch = userMessage.match(/between\s+(\d+)\s*[-–to]\s*(\d+)/i) ||
                       userMessage.match(/(\d+)\s*[-–]\s*(\d+)/);
  
  if (betweenMatch) {
    return {
      minPrice: parseInt(betweenMatch[1]),
      maxPrice: parseInt(betweenMatch[2])
    };
  }
  
  // Pattern: "around X" (±20% range)
  const aroundMatch = userMessage.match(/around\s+(\d+)/i);
  if (aroundMatch) {
    const price = parseInt(aroundMatch[1]);
    return {
      minPrice: Math.floor(price * 0.8),
      maxPrice: Math.ceil(price * 1.2)
    };
  }
  
  return {
    maxPrice: null,
    minPrice: null
  };
}

// ============================================
// HELPER: Get Category ID from Name
// ============================================
async function getCategoryId(categoryName) {
  try {
    const result = await pool.query(
      'SELECT id FROM Categories WHERE name ILIKE $1',
      [categoryName]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    console.error('Error getting category ID:', error);
    return null;
  }
}

// ============================================
// HELPER: Get Top 2-3 Reviews for Product
// ============================================
async function getTopReviews(productId, limit = 2) {
  try {
    const result = await pool.query(`
      SELECT 
        r.id, 
        r.rating, 
        r.review_text, 
        r.helpful_count,
        u.name, 
        u.display_name
      FROM Reviews r
      JOIN Users u ON r.user_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.rating DESC, r.helpful_count DESC
      LIMIT $2
    `, [productId, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}

// ============================================
// HELPER: Get Products by Category & Price
// ============================================
async function searchProducts(categoryId, minPrice = null, maxPrice = null, limit = 3) {
  try {
    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description,
        p.price, 
        p.image_urls,
        p.rating_average, 
        p.review_count,
        p.buy_button_1_name,
        p.buy_button_1_url,
        c.name as category_name
      FROM Products p
      JOIN Categories c ON p.category_id = c.id
      WHERE p.category_id = $1
    `;
    
    const params = [categoryId];
    let paramCount = 1;
    
    // Add price constraints
    if (minPrice !== null) {
      paramCount++;
      query += ` AND p.price >= $${paramCount}`;
      params.push(minPrice);
    }
    
    if (maxPrice !== null) {
      paramCount++;
      query += ` AND p.price <= $${paramCount}`;
      params.push(maxPrice);
    }
    
    // Sort by rating, then by review count
    query += ` ORDER BY COALESCE(p.rating_average, 0) DESC, p.review_count DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

// ============================================
// HELPER: Format Product for Chat Display
// ============================================
async function formatProductCard(product) {
  // Get top reviews for this product
  const reviews = await getTopReviews(product.id, 2);
  
  // Parse image URLs
  let imageUrl = '/placeholder-product.jpg';
  try {
    if (typeof product.image_urls === 'string') {
      if (product.image_urls.startsWith('[')) {
        const images = JSON.parse(product.image_urls);
        if (Array.isArray(images) && images.length > 0) {
          imageUrl = images[0];
        }
      } else {
        imageUrl = product.image_urls;
      }
    }
  } catch (error) {
    console.error('Error parsing image URLs:', error);
  }
  
  return {
    id: product.id,
    name: product.name,
    price: `₹${product.price}`,
    image: imageUrl,
    rating: product.rating_average ? parseFloat(product.rating_average).toFixed(1) : 'N/A',
    reviews_count: product.review_count || 0,
    category: product.category_name,
    description: product.description ? product.description.substring(0, 100) + '...' : '',
    topReviews: reviews.map(r => ({
      rating: r.rating,
      text: r.review_text ? r.review_text.substring(0, 80) + '...' : 'No comment',
      author: r.display_name || r.name || 'Anonymous'
    }))
  };
}

// ============================================
// HELPER: Build Bot Response
// ============================================
function buildBotResponse(userName, category, priceInfo, productsCount) {
  const priceText = (() => {
    if (priceInfo.minPrice && priceInfo.maxPrice) {
      return `between ₹${priceInfo.minPrice} - ₹${priceInfo.maxPrice}`;
    } else if (priceInfo.maxPrice) {
      return `under ₹${priceInfo.maxPrice}`;
    } else if (priceInfo.minPrice) {
      return `above ₹${priceInfo.minPrice}`;
    }
    return '';
  })();
  
  if (productsCount === 0) {
    return `Sorry ${userName}, I couldn't find any ${category} ${priceText}. Try adjusting your budget or let me know if you want to explore other categories!`;
  }
  
  if (productsCount === 1) {
    return `Great! I found 1 perfect ${category} ${priceText} for you, ${userName}! 🎯`;
  }
  
  return `Excellent! Here are the top ${Math.min(productsCount, 3)} ${category} options ${priceText} for you, ${userName}! ⭐`;
}

// ============================================
// MAIN ENDPOINT: POST /api/chat/message
// ============================================
router.post('/message', authenticateToken, chatLimit, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, sessionId, chatHistory = [] } = req.body;
    
    // Validate input
    if (!message || !sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: message, sessionId'
      });
    }
    
    if (message.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Message cannot be empty'
      });
    }
    
    // Get user info for greeting
    const userResult = await pool.query(
      'SELECT name, display_name FROM Users WHERE id = $1',
      [userId]
    );
    
    const userName = userResult.rows[0]?.display_name || 
                     userResult.rows[0]?.name || 
                     'there';
    
    const userMessage = message.trim();
    
    // ============================================
    // DETECT INTENT
    // ============================================
    
    // Check if greeting
    const greetingPatterns = ['hi', 'hello', 'hey', 'hai', 'hii', 'hiii', 'helo'];
    const isGreeting = greetingPatterns.some(pattern => 
      userMessage.toLowerCase().includes(pattern)
    );
    
    if (isGreeting && chatHistory.length === 0) {
      // First greeting - suggest categories
      const botReply = `👋 Hi ${userName}! What are you looking for today? Any specific product?`;
      
      const categoryButtons = [
        'Laptops', 'Earbuds', 'Running Shoes', 'Crocs', 'Keyboards',
        'Mouse', 'Powerbank', 'Headphones', 'College Bags', 'Webcam'
      ];
      
      return res.json({
        status: 'success',
        data: {
          reply: botReply,
          suggestions: categoryButtons,
          products: []
        }
      });
    }
    
    // ============================================
    // EXTRACT PRODUCT SEARCH INTENT
    // ============================================
    const category = extractCategory(userMessage);
    const priceConstraints = extractPriceConstraints(userMessage);
    
    // If product search detected
    if (category) {
      // Get category ID
      const categoryId = await getCategoryId(category);
      
      if (!categoryId) {
        return res.json({
          status: 'success',
          data: {
            reply: `Sorry ${userName}, I don't have ${category} in my database yet. Try another category!`,
            suggestions: ['Laptops', 'Earbuds', 'Running Shoes', 'Keyboards', 'Powerbank'],
            products: []
          }
        });
      }
      
      // Check if user specified price
      if (!priceConstraints.maxPrice && !priceConstraints.minPrice) {
        // Ask for budget
        const budgetOptions = [
          { label: 'Under ₹1,000', value: 1000 },
          { label: 'Under ₹2,000', value: 2000 },
          { label: 'Under ₹5,000', value: 5000 },
          { label: 'Under ₹10,000', value: 10000 },
          { label: 'Any budget', value: 999999 }
        ];
        
        return res.json({
          status: 'success',
          data: {
            reply: `Great! ${category} it is! 💰 What's your budget, ${userName}?`,
            budgetOptions: budgetOptions,
            products: []
          }
        });
      }
      
      // Search products
      const products = await searchProducts(
        categoryId,
        priceConstraints.minPrice,
        priceConstraints.maxPrice,
        10 // Get up to 10 for pagination
      );
      
      if (products.length === 0) {
        return res.json({
          status: 'success',
          data: {
            reply: `Sorry ${userName}, no ${category} available in your budget. Try a higher budget or another category!`,
            suggestions: ['Laptops', 'Earbuds', 'Running Shoes', 'Keyboards'],
            products: []
          }
        });
      }
      
      // ✅ Format ALL products for pagination
      const formattedProducts = await Promise.all(
        products.map(p => formatProductCard(p))
      );
      
      // ✅ Get only first 3 to display initially
      const initialProducts = formattedProducts.slice(0, 3);
      
      // Build response
      const botReply = buildBotResponse(userName, category, priceConstraints, formattedProducts.length);
      
      return res.json({
        status: 'success',
        data: {
          reply: botReply,
          hasMore: formattedProducts.length > 3, // ✅ Check against ALL products
          products: initialProducts, // ✅ Show only first 3
          allProducts: formattedProducts // ✅ Send all for pagination
        }
      });
    }
    
    // ============================================
    // FALLBACK: UNRECOGNIZED INPUT
    // ============================================
    return res.json({
      status: 'success',
      data: {
        reply: `Sorry ${userName}, I didn't quite understand that. I'm here to help you find products! Try asking for something like "Earbuds under 1000" or "Laptops between 30000-50000". 🛍️`,
        suggestions: ['Laptops', 'Earbuds', 'Running Shoes', 'Keyboards', 'Powerbank'],
        products: []
      }
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Chat service error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
});

// ============================================
// OPTIONAL: GET /api/chat/history/:sessionId
// ============================================
router.get('/history/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // In MVP with localStorage, backend doesn't store history
    // This endpoint exists for future enhancement
    
    res.json({
      status: 'success',
      message: 'Chat history endpoint (for future use)',
      data: {
        history: [],
        note: 'Chat history stored in browser localStorage in MVP'
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve history'
    });
  }
});

module.exports = router;
