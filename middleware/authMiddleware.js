// =============================================================================
// middleware/authMiddleware.js  —  JWT Authentication Guard
// -----------------------------------------------------------------------------
// This middleware verifies a Bearer JWT token on every protected route.
// Usage: router.get('/protected', protect, handler)
// =============================================================================

const jwt = require('jsonwebtoken');

/**
 * Express middleware that checks for a valid JWT in the Authorization header.
 * If valid → attaches decoded payload to req.admin and calls next().
 * If missing/invalid → responds immediately with 401 Unauthorized.
 */
function protect(req, res, next) {
  // Expect header: "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization || '';

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided. Admin access required.' });
  }

  const token = authHeader.slice(7); // strip "Bearer " prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // attach payload (role, iat, exp) to the request
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token. Please log in again.' });
  }
}

module.exports = { protect };
