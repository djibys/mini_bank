const Compte = require('../models/Compte');
const User = require('../models/User');

// Créer un compte
const createCompte = async (req, res) => {
  try {
    const { userId, typeCompte, numeroCompteAgent, numeroCompteDistributeur } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si le compte existe déjà
    const existingCompte = await Compte.findOne({ userId, typeCompte });
    if (existingCompte) {
      return res.status(409).json({
        success: false,
        message: 'Ce compte existe déjà'
      });
    }

    // Générer numéro de compte
    const numeroCompte = user.numeroCompte || `CPT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const compte = new Compte({
      numeroCompte,
      userId,
      typeCompte,
      numeroCompteAgent,
      numeroCompteDistributeur,
      solde: 0
    });

    await compte.save();

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      data: compte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Récupérer tous les comptes
const getComptes = async (req, res) => {
  try {
    const { typeCompte, userId } = req.query;
    
    let query = {};
    if (typeCompte) query.typeCompte = typeCompte;
    if (userId) query.userId = userId;

    const comptes = await Compte.find(query)
      .populate('userId', 'nom prenom email tel')
      .sort({ dateCreation: -1 });

    res.json({
      success: true,
      data: comptes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Récupérer un compte par numéro
const getCompteByNumero = async (req, res) => {
  try {
    const { numeroCompte } = req.params;

    const compte = await Compte.findOne({ numeroCompte })
      .populate('userId', 'nom prenom email tel');

    if (!compte) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    res.json({
      success: true,
      data: compte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Mettre à jour le solde
const updateSolde = async (req, res) => {
  try {
    const { numeroCompte } = req.params;
    const { montant, operation } = req.body;

    const compte = await Compte.findOne({ numeroCompte });
    if (!compte) {
      return res.status(404).json({
        success: false,
        message: 'Compte non trouvé'
      });
    }

    if (operation === 'DEBIT') {
      if (compte.solde < montant) {
        return res.status(400).json({
          success: false,
          message: 'Solde insuffisant'
        });
      }
      compte.solde -= montant;
    } else if (operation === 'CREDIT') {
      compte.solde += montant;
    }

    compte.derniereTransaction = new Date();
    await compte.save();

    res.json({
      success: true,
      message: 'Solde mis à jour',
      data: compte
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

module.exports = {
  createCompte,
  getComptes,
  getCompteByNumero,
  updateSolde
};