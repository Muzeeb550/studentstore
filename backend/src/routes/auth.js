const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth login
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

// Google OAuth callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Generate JWT token
        const token = jwt.sign(
            { 
                id: req.user.id, 
                email: req.user.email, 
                role: req.user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.redirect(process.env.FRONTEND_URL);
    });
});

// Get current user info
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ 
            message: 'User authenticated',
            user: decoded 
        });
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router;
