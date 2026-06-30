import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import BlacklistedToken from '../models/BlacklistedToken.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const isBlacklisted = await BlacklistedToken.findOne({ token });
      if (isBlacklisted) {
        return res.status(401).json({ message: 'Not authorized, token invalidated' });
      }
      
      const isAppRoute = req.originalUrl.includes('/api/app/');
      const secret = isAppRoute 
        ? (process.env.JWT_SECRET_APP || process.env.JWT_SECRET) 
        : (process.env.JWT_SECRET_WEB || process.env.JWT_SECRET);
        
      const decoded = jwt.verify(token, secret);
      
      // Backward compatibility & token source validation
      if (decoded.source) {
        if (isAppRoute && decoded.source !== 'app') {
          return res.status(401).json({ message: 'Not authorized, invalid token source for app' });
        }
        if (!isAppRoute && decoded.source !== 'web') {
          return res.status(401).json({ message: 'Not authorized, invalid token source for web' });
        }
      }
      
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      // Block requests if password reset is required, except for the force reset endpoint itself
      if (req.user.mustResetPassword && !req.originalUrl.includes('/force-reset-password')) {
        return res.status(403).json({ message: 'Password reset required' });
      }

      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'OEM') {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized as an admin' });
  }
};
