// =============================================================================
// routes/auth.js  —  Admin Authentication Routes
// -----------------------------------------------------------------------------
// POST /api/auth/login  → validate admin password → return JWT token
// GET  /api/auth/verify → verify an existing JWT token (used on page load)
// =============================================================================

const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Validates the admin password and returns a signed JWT token on success.
router.post('/login', (req, res) => {
  const { password } = req.body;

  // Check password against the env variable
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, error: 'Incorrect admin password.' });
  }

  // Sign a JWT token that expires in 8 hours
  const token = jwt.sign(
    { role: 'admin', loginAt: new Date().toISOString() },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  console.log(`🔐 Admin login at ${new Date().toLocaleTimeString()}`);

  res.json({
    success: true,
    token,
    message: 'Login successful. Welcome to the admin panel!',
  });
});

// ── GET /api/auth/verify ─────────────────────────────────────────────────────
// Called on admin panel load to check if the stored token is still valid.
router.get('/verify', protect, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

module.exports = router;
