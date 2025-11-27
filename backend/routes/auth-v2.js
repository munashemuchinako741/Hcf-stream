const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { db } = require('../server/db');
const { users, passwordResetTokens } = require('../schema/schema');
const { eq, and, gt } = require('drizzle-orm');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const { Result } = require('express-validator');

const router = express.Router();

// Store revoked refresh tokens (in production, use Redis)
// Format: { token: { expiresAt: timestamp } }
const revokedTokens = new Map();

// Token configuration
const TOKEN_CONFIG = {
  accessToken: {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m', // 15 minutes
    secret: process.env.JWT_SECRET,
  },
  refreshToken: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d', // 7 days
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
  },
};

/**
 * Generate tokens for authenticated user
 */
function generateTokens(userId, userRole) {
  const accessToken = jwt.sign(
    { id: userId, role: userRole, type: 'access' },
    TOKEN_CONFIG.accessToken.secret,
    { expiresIn: TOKEN_CONFIG.accessToken.expiresIn }
  );

  const refreshToken = jwt.sign(
    { id: userId, role: userRole, type: 'refresh' },
    TOKEN_CONFIG.refreshToken.secret,
    { expiresIn: TOKEN_CONFIG.refreshToken.expiresIn }
  );

  return { accessToken, refreshToken };
}

/**
 * Set refresh token as HTTP-only secure cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/api/v2/auth',
  });
}

/**
 * Clear refresh token cookie
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', { path: '/api/v2/auth' });
}

/**
 * Log authentication event for audit trail
 */
async function logAuthEvent(userId, eventType, metadata = {}) {
  try {
    // In production, store in database
    const timestamp = new Date().toISOString();
    const event = { userId, eventType, timestamp, ...metadata };
    
    // TODO: Store in auth_logs table
    console.log('AUTH_EVENT:', event);
  } catch (error) {
    console.error('Failed to log auth event:', error);
  }
}

// API Versioning: v2 endpoints with enhanced security
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({ error: 'User already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const user = await db.insert(users).values({
      email,
      password: hashedPassword,
      username: name
    }).returning();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user[0];
    res.status(201).json({
      message: 'User registered successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.length === 0) {
      await logAuthEvent(null, 'LOGIN_FAILED_USER_NOT_FOUND', { email });
      return res.status(401).json({ error: 'User not registered' });
    }

    if (!await bcrypt.compare(password, user[0].password)) {
      await logAuthEvent(user[0].id, 'LOGIN_FAILED_INVALID_PASSWORD', { email });
      return res.status(401).json({ error: 'Incorrect password' });
    }
    console.log('User login result:',user[0]);
    console.log('API_BASE=', API_BASE);

    // block unverified / unapproved users
    if (!user[0].isApproved) {
      await logAuthEvent(user[0].id, 'LOGIN_FAILED_NOT_APPROVED', { email });
      return res.status(403).json({
        error: 'Account not approved yet',
        message:
          'Your account has been created, but it has not been approved by an administrator yet.',
      });
    }

    // Generate both access and refresh tokens
    const { accessToken, refreshToken } = generateTokens(user[0].id, user[0].role);

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, refreshToken);

    // Log successful login
    await logAuthEvent(user[0].id, 'LOGIN_SUCCESS', { email });

    // Return user without password (access token in body for backward compatibility)
    const { password: _, ...userWithoutPassword } = user[0];
    res.json({
      message: 'Login successful',
      token: accessToken, // Short-lived access token
      user: userWithoutPassword,
      expiresIn: '15m', // Tell client when token expires
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || user.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing tokens for this user
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user[0].id));

    // Insert new token
    await db.insert(passwordResetTokens).values({
      userId: user[0].id,
      token: resetToken,
      expiresAt,
    });

    // Send email
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your HCF Stream account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // Validate password strength (basic)
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find valid token
    const resetToken = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, new Date())))
      .limit(1);

    if (!resetToken || resetToken.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, resetToken[0].userId));

    // Delete used token
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, resetToken[0].id));

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      try {
        // Fetch user data from database
        const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

        if (!user || user.length === 0) {
          return res.status(401).json({ error: 'User not found' });
        }

        // Return user data (without password)
        const { password, ...userWithoutPassword } = user[0];
        res.json({ user: userWithoutPassword });
      } catch (dbError) {
        console.error('Database error during token verification:', dbError);
        res.status(500).json({ error: 'Database error' });
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Refresh access token using refresh token from cookie
 * POST /api/v2/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required' });
    }

    // Check if token has been revoked
    if (revokedTokens.has(refreshToken)) {
      await logAuthEvent(null, 'REFRESH_TOKEN_REVOKED', {});
      clearRefreshTokenCookie(res);
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }

    // Verify refresh token
    jwt.verify(refreshToken, TOKEN_CONFIG.refreshToken.secret, async (err, decoded) => {
      if (err) {
        await logAuthEvent(decoded?.id, 'REFRESH_TOKEN_INVALID', {});
        clearRefreshTokenCookie(res);
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      try {
        // Fetch user to ensure they still exist
        const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

        if (!user || user.length === 0) {
          await logAuthEvent(decoded.id, 'REFRESH_TOKEN_USER_NOT_FOUND', {});
          clearRefreshTokenCookie(res);
          return res.status(401).json({ error: 'User not found' });
        }

        // Generate new tokens (refresh token rotation)
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user[0].id, user[0].role);

        // Revoke old refresh token
        const decodedRefresh = jwt.decode(refreshToken);
        if (decodedRefresh.exp) {
          revokedTokens.set(refreshToken, { expiresAt: new Date(decodedRefresh.exp * 1000) });
        }

        // Set new refresh token cookie
        setRefreshTokenCookie(res, newRefreshToken);

        // Log successful refresh
        await logAuthEvent(user[0].id, 'TOKEN_REFRESHED', {});

        res.json({
          message: 'Token refreshed successfully',
          token: accessToken,
          expiresIn: '15m',
        });
      } catch (dbError) {
        console.error('Database error during token refresh:', dbError);
        res.status(500).json({ error: 'Database error' });
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Logout endpoint - revoke refresh token
 * POST /api/v2/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const { token: accessToken } = req.body;

    // Revoke the refresh token if present
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      if (decoded && decoded.exp) {
        revokedTokens.set(refreshToken, { expiresAt: new Date(decoded.exp * 1000) });
      }
    }

    // Clear refresh token cookie
    clearRefreshTokenCookie(res);

    // Log logout
    if (accessToken) {
      const decoded = jwt.decode(accessToken);
      if (decoded?.id) {
        await logAuthEvent(decoded.id, 'LOGOUT', {});
      }
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
