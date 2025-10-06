require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require('path');

// Import des routes
const userRoutes = require("./routes/userRoutes");
const compteRoutes = require('./routes/compteRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();

// CORS - Configuration pour Vercel et Render (DOIT être avant tout)
app.use(
  cors({
    origin: true, // Autorise tous les origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Middleware de sécurité - Configuration adaptée pour permettre le chargement des images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: "Trop de requêtes, réessayez plus tard.",
  },
});
app.use(limiter);

// Logging
app.use(morgan("combined"));

// Parsers (avec gestion d'erreur pour body trop large)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "API User Management fonctionnelle",
    timestamp: new Date().toISOString(),
  });
});
app.use('/api/comptes', compteRoutes);
app.use('/api/transactions', transactionRoutes);
app.use("/api/users", userRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} non trouvée`,
  });
});

// Error Handler
app.use((error, req, res, next) => {
  console.error("Erreur:", error);
  
  // Gestion spécifique des erreurs de parsing JSON
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: "Corps de requête JSON invalide",
    });
  }
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Erreur serveur",
    ...(process.env.NODE_ENV === "development" && { error: error.message, stack: error.stack }),
  });
});

// Validation JWT_SECRET
if (!process.env.JWT_SECRET) {
  console.error(
    "❌ ERREUR: JWT_SECRET doit être défini dans les variables d'environnement"
  );
  process.exit(1);
}

// Connexion MongoDB
const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4
      retryWrites: true,
      w: 'majority'
    };
    
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/minibank";
    console.log("🔄 Connexion à MongoDB Atlas...");
    
    await mongoose.connect(mongoUri, options);
    console.log("✅ MongoDB connecté avec succès");
  } catch (error) {
    console.error("❌ Erreur MongoDB:", error.message);
    console.error("\n⚠️  Solutions possibles:");
    console.error("1. Sur MongoDB Atlas > Network Access > Add IP Address > Allow Access from Anywhere (0.0.0.0/0)");
    console.error("2. Attendez 2-3 minutes que l'IP soit active sur Atlas");
    console.error("3. Vérifiez que MONGODB_URI dans .env commence par 'mongodb+srv://'");
    console.error("4. Vérifiez votre connexion Internet\n");
    
    // En production (Render), on peut vouloir continuer sans crash
    if (process.env.NODE_ENV === 'production') {
      console.error("⚠️  Mode production: Le serveur continue sans MongoDB");
    } else {
      process.exit(1);
    }
  }
};

// Démarrage serveur
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📚 bonjour SENE`);
  });
};

startServer();

module.exports = app;