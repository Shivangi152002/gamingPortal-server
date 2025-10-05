// Simple session-based authentication
export const authenticateSession = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated. Please login.' 
    });
  }
  
  req.user = req.session.user;
  next();
};

// Check if user is root
export const requireRoot = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authenticated.' 
    });
  }
  
  if (req.session.user.role !== 'root') {
    return res.status(403).json({ 
      success: false, 
      message: 'Only root user can perform this action.' 
    });
  }
  
  next();
};
