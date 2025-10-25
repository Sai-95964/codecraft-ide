const jwt = require('jsonwebtoken');

function extractToken(headerValue) {
  if (!headerValue) return null;
  if (headerValue.startsWith('Bearer ')) {
    return headerValue.slice(7).trim();
  }
  return null;
}

module.exports = function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization || req.headers.Authorization);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'devsecret';
    const payload = jwt.verify(token, secret);

    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name
    };
    req.authToken = token;

    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
