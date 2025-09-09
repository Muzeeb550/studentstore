const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { getPool, sql } = require('./database');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const pool = await getPool();
        
        console.log('🔐 Google OAuth Profile:', {
            id: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value
        });
        
        // Check if user exists
        const userResult = await pool.request()
            .input('googleId', sql.VarChar, profile.id)
            .query('SELECT * FROM Users WHERE google_id = @googleId');
        
        if (userResult.recordset.length > 0) {
            // User exists, update last login and return user
            const user = userResult.recordset[0];
            
            await pool.request()
                .input('userId', sql.Int, user.id)
                .query('UPDATE Users SET updated_at = GETDATE() WHERE id = @userId');
            
            console.log('✅ Existing user logged in:', user.name);
            return done(null, user);
        } else {
            // Create new user with unique display name
            const baseName = profile.displayName;
            let displayName = baseName;
            let counter = 1;
            
            // Ensure unique display name
            while (true) {
                const nameCheck = await pool.request()
                    .input('displayName', sql.VarChar, displayName)
                    .query('SELECT COUNT(*) as count FROM Users WHERE display_name = @displayName');
                
                if (nameCheck.recordset[0].count === 0) {
                    break;
                }
                displayName = `${baseName}${counter}`;
                counter++;
            }
            
            // Insert new user
            const newUserResult = await pool.request()
                .input('googleId', sql.VarChar, profile.id)
                .input('name', sql.VarChar, profile.displayName)
                .input('displayName', sql.VarChar, displayName)
                .input('email', sql.VarChar, profile.emails[0].value)
                .input('profilePicture', sql.VarChar, profile.photos[0]?.value || null)
                .input('role', sql.VarChar, 'student')
                .query(`
                    INSERT INTO Users (google_id, name, display_name, email, profile_picture, role, is_active, created_at, updated_at)
                    OUTPUT INSERTED.*
                    VALUES (@googleId, @name, @displayName, @email, @profilePicture, @role, 1, GETDATE(), GETDATE())
                `);
            
            const newUser = newUserResult.recordset[0];
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
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Users WHERE id = @id');
        
        done(null, result.recordset[0]);
    } catch (error) {
        done(error, null);
    }
});

module.exports = passport;
