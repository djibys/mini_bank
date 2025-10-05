const User = require("./User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const JWT_SECRET = process.env.JWT_SECRET;

// Fonction utilitaire pour valider les ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Fonction utilitaire pour gérer les erreurs de duplication MongoDB
const handleDuplicateError = (error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];

    switch (field) {
      case "email":
        return "Cette adresse email est déjà utilisée";
      case "NcarteIdentite":
        return "Ce numéro de carte d'identité est déjà utilisé";
      case "numeroCompte":
        return "Ce numéro de compte existe déjà";
      default:
        return `La valeur "${value}" est déjà utilisée`;
    }
  }
  return null;
};

// Connexion utilisateur
const login = async (req, res) => {
  try {
    const { email, pwd } = req.body;

    // Validation des données d'entrée
    if (!email || !pwd) {
      return res.status(400).json({
        success: false,
        message: "Email et mot de passe requis",
      });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email }).select("+pwd");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Vérifier si le compte est bloqué
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Votre compte est bloqué",
      });
    }

    // Vérifier le mot de passe
    const isValidPassword = await user.comparePassword(pwd);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Email ou mot de passe incorrect",
      });
    }

    // Mettre à jour la date de dernière connexion
    user.lastLogin = new Date();
    await user.save();

    // Générer le token
    const token = jwt.sign(
      { userId: user._id, email: user.email, type: user.typeUtilisateur },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Retourner les données utilisateur (sans mot de passe)
    const userResponse = user.toObject();
    delete userResponse.pwd;
    delete userResponse.pwdTemporaire;

    res.json({
      success: true,
      message: "Connexion réussie",
      data: {
        token,
        user: userResponse,
      },
    });
  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Ajouter un compte
const addAccount = async (req, res) => {
  try {
    const userData = req.body;

    // Validation des champs requis
    const requiredFields = [
      "nom",
      "prenom",
      "email",
      "tel",
      "adresse",
      "dateNaissance",
      "pwd",
      "NcarteIdentite",
    ];
    for (const field of requiredFields) {
      if (!userData[field]) {
        return res.status(400).json({
          success: false,
          message: `Le champ ${field} est requis`,
        });
      }
    }

    // Créer le nouvel utilisateur
    const newUser = new User(userData);
    await newUser.save();

    // Retourner l'utilisateur créé (sans mot de passe)
    const userResponse = newUser.toObject();
    delete userResponse.pwd;
    delete userResponse.pwdTemporaire;

    res.status(201).json({
      success: true,
      message: "Compte créé avec succès",
      data: userResponse,
    });
  } catch (error) {
    console.error("Erreur addAccount:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    const duplicateMessage = handleDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage,
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Modifier un compte
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validation de l'ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    // Supprimer les champs sensibles de la mise à jour
    delete updateData.pwd;
    delete updateData.pwdTemporaire;
    delete updateData.numeroCompte;
    delete updateData.typeUtilisateur; // Seuls les admins peuvent modifier le type

    // Vérifier si l'utilisateur existe
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Compte mis à jour avec succès",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Erreur updateAccount:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }

    const duplicateMessage = handleDuplicateError(error);
    if (duplicateMessage) {
      return res.status(409).json({
        success: false,
        message: duplicateMessage,
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Changer le mot de passe
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Validation de l'ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    // Validation des données
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe actuel et nouveau mot de passe requis",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe doit contenir au moins 6 caractères",
      });
    }

    const user = await User.findById(id).select("+pwd");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Vérifier le mot de passe actuel
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: "Mot de passe actuel incorrect",
      });
    }

    // Mettre à jour le mot de passe
    user.pwd = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    console.error("Erreur changePassword:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Supprimer un compte (AGENT/ADMIN seulement)
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Empêcher la suppression du dernier admin
    if (user.typeUtilisateur === "ADMIN") {
      const adminCount = await User.countDocuments({
        typeUtilisateur: "ADMIN",
      });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Impossible de supprimer le dernier administrateur",
        });
      }
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Compte supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur deleteAccount:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Bloquer un utilisateur
const blockUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Empêcher de bloquer un admin (sauf par un autre admin)
    if (
      user.typeUtilisateur === "ADMIN" &&
      req.user.typeUtilisateur !== "ADMIN"
    ) {
      return res.status(403).json({
        success: false,
        message: "Seul un administrateur peut bloquer un autre administrateur",
      });
    }

    user.isBlocked = true;
    await user.save();

    res.json({
      success: true,
      message: "Utilisateur bloqué avec succès",
      data: user,
    });
  } catch (error) {
    console.error("Erreur blockUser:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Débloquer un utilisateur
const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    user.isBlocked = false;
    await user.save();

    res.json({
      success: true,
      message: "Utilisateur débloqué avec succès",
      data: user,
    });
  } catch (error) {
    console.error("Erreur unblockUser:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Blocage multiple
const blockMultipleUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste d'IDs utilisateurs requise",
      });
    }

    // Validation des ObjectIds
    for (const id of userIds) {
      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: `ID utilisateur invalide: ${id}`,
        });
      }
    }

    // Empêcher de bloquer des admins si l'utilisateur n'est pas admin
    if (req.user.typeUtilisateur !== "ADMIN") {
      const admins = await User.find({
        _id: { $in: userIds },
        typeUtilisateur: "ADMIN",
      });

      if (admins.length > 0) {
        return res.status(403).json({
          success: false,
          message:
            "Seul un administrateur peut bloquer d'autres administrateurs",
        });
      }
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { isBlocked: true }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} utilisateurs bloqués avec succès`,
      data: { blockedCount: result.modifiedCount },
    });
  } catch (error) {
    console.error("Erreur blockMultipleUsers:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Suppression multiple
const deleteMultipleUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste d'IDs utilisateurs requise",
      });
    }

    // Validation des ObjectIds
    for (const id of userIds) {
      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: `ID utilisateur invalide: ${id}`,
        });
      }
    }

    // Empêcher de supprimer tous les admins
    const admins = await User.find({
      _id: { $in: userIds },
      typeUtilisateur: "ADMIN",
    });

    if (admins.length > 0) {
      const totalAdmins = await User.countDocuments({
        typeUtilisateur: "ADMIN",
      });
      if (totalAdmins <= admins.length) {
        return res.status(400).json({
          success: false,
          message: "Impossible de supprimer tous les administrateurs",
        });
      }
    }

    const result = await User.deleteMany({ _id: { $in: userIds } });

    res.json({
      success: true,
      message: `${result.deletedCount} utilisateurs supprimés avec succès`,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error) {
    console.error("Erreur deleteMultipleUsers:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Lister les utilisateurs
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      type = "",
      isBlocked = "",
      sortBy = "dateCreation",
      sortOrder = "desc",
    } = req.query;

    // Validation des paramètres de pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 éléments par page

    let query = {};

    // Filtre de recherche
    if (search) {
      query.$or = [
        { nom: { $regex: search, $options: "i" } },
        { prenom: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { NcarteIdentite: { $regex: search, $options: "i" } },
        { numeroCompte: { $regex: search, $options: "i" } },
      ];
    }

    // Filtre par type d'utilisateur
    if (type && ["CLIENT", "AGENT", "ADMIN"].includes(type)) {
      query.typeUtilisateur = type;
    }

    // Filtre par statut bloqué
    if (isBlocked === "true") {
      query.isBlocked = true;
    } else if (isBlocked === "false") {
      query.isBlocked = false;
    }

    // Options de tri
    const sortOptions = {};
    const validSortFields = [
      "dateCreation",
      "nom",
      "prenom",
      "email",
      "lastLogin",
    ];
    const validSortOrders = ["asc", "desc"];

    if (
      validSortFields.includes(sortBy) &&
      validSortOrders.includes(sortOrder)
    ) {
      sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    } else {
      sortOptions.dateCreation = -1; // Tri par défaut
    }

    const users = await User.find(query)
      .select("-pwd -pwdTemporaire")
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          pageSize: limitNum,
          totalItems: total,
          hasNext: pageNum < Math.ceil(total / limitNum),
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("Erreur getUsers:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Obtenir un utilisateur par ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation de l'ObjectId
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID utilisateur invalide",
      });
    }

    const user = await User.findById(id).select("-pwd -pwdTemporaire");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Erreur getUserById:", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  login,
  addAccount,
  updateAccount,
  changePassword,
  deleteAccount,
  blockUser,
  unblockUser,
  blockMultipleUsers,
  deleteMultipleUsers,
  getUsers,
  getUserById,
};
