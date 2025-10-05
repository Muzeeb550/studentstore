const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('./database');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔐 Google OAuth Profile:', {
            id: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value
        });
        
        // Check if user exists
        const userResult = await pool.query(
            'SELECT * FROM Users WHERE google_id = $1',
            [profile.id]
        );
        
        if (userResult.rows.length > 0) {
            // User exists, update last login
            const user = userResult.rows[0];
            
            await pool.query(
                'UPDATE Users SET updated_at = NOW() WHERE id = $1',
                [user.id]
            );
            
            console.log('✅ Existing user logged in:', user.name);
            return done(null, user);
        } else {
            // Create new user with unique display name
            const baseName = profile.displayName;
            let displayName = baseName;
            let counter = 1;
            
            // Ensure unique display name
            while (true) {
                const nameCheck = await pool.query(
                    'SELECT COUNT(*) as count FROM Users WHERE display_name = $1',
                    [displayName]
                );
                
                if (parseInt(nameCheck.rows[0].count) === 0) {
                    break;
                }
                displayName = `${baseName}${counter}`;
                counter++;
            }
            
            // Insert new user
            const newUserResult = await pool.query(`
                INSERT INTO Users (google_id, name, display_name, email, profile_picture, role, is_active, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
                RETURNING *
            `, [
                profile.id,
                profile.displayName,
                displayName,
                profile.emails[0].value,
                profile.photos[0]?.value || null,
                'student',
                true
            ]);
            
            const newUser = newUserResult.rows[0];
            console.log('🎉 New student registered:', newUser.display_name);
            return done(null, newUser);
        }
    } catch (error) {
        console.error('❌ Google OAuth error:', error);
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query(
            'SELECT * FROM Users WHERE id = $1',
            [id]
        );
        
        done(null, result.rows[0]);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
