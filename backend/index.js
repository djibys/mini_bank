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

// CORS - Configuration corrigée (DOIT être avant helmet et rate limiter)
const allowedOrigins = [
  'http://localhost:3001'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Autoriser les requêtes sans origin (comme Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
  })
);

// Middleware de sécurité - Configuration adaptée pour permettre le chargement des images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
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

// Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

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
  res.status(500).json({
    success: false,
    message: "Erreur serveur",
    ...(process.env.NODE_ENV === "development" && { error: error.message }),
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
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/minibank"
    );
    console.log("✅ MongoDB connecté");
  } catch (error) {
    console.error("❌ Erreur MongoDB:", error);
    process.exit(1);
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