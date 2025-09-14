const jwt = require('jsonwebtoken');

const requireAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                status: 'error',
                message: 'Access denied. No token provided.' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ 
                status: 'error',
                message: 'Access denied. Admin role required.' 
            });
        }

        req.user = decoded;
        next();
        
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(401).json({ 
            status: 'error',
            message: 'Invalid token' 
        });
    }
};

module.exports = { requireAdmin };
