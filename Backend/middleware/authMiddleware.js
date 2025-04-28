const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes for authenticated users
const protect = async (req, res, next) => {
  let token = req.cookies.jwt; // Assuming you're using cookies

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      next(); // Proceed to the next middleware or route
    } catch (error) {
      res.status(401).json({ message: 'Unauthorized, invalid token' });
    }
  } else {
    res.status(401).json({ message: 'No token, authorization denied' });
  }
};
// Middleware to protect routes for admin users
const adminProtect = async (req, res, next) => {
  // Ensure the user exists and has the admin role
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied, admin only' });
};

module.exports = { protect, adminProtect };
