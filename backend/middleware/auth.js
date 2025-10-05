const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token d'accès requis",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Compte bloqué",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Token invalide",
    });
  }
};

// Middleware pour vérifier les permissions d'agent/admin
const requireAgentOrAdmin = (req, res, next) => {
  if (
    req.user.typeUtilisateur === "AGENT" 
    
  ) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Accès refusé: permissions insuffisantes",
    });
  }
};


module.exports = { authenticateToken, requireAgentOrAdmin };
