const User = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// =================== CONFIG & UTILS ===================
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const UPLOAD_DIR = 'uploads/profiles';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'; 

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const tokenBlacklist = new Set();
const isTokenBlacklisted = (token) => tokenBlacklist.has(token);

// =================== MULTER SETUP ===================
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(UPLOAD_DIR, { recursive: true });
            cb(null, UPLOAD_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const uploadMiddleware = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Seules les images (JPEG, PNG, GIF) sont autorisées'));
    }
}).single('profilePicture'); 

// =================== AUTHENTIFICATION ===================
const login = async (req, res) => {
    try {
        const { email, pwd } = req.body;
        const user = await User.findOne({ email }).select("+pwd");

        if (!user || !(await user.comparePassword(pwd))) {
            return res.status(401).json({ success: false, message: "Email ou mot de passe incorrect" });
        }

        // Vérifier si l'utilisateur est un AGENT
        if (user.typeUtilisateur !== 'AGENT') {
            return res.status(403).json({ 
                success: false, 
                message: "Accès refusé. Seuls les agents peuvent se connecter à cette application." 
            });
        }

        // Vérifier si le compte est bloqué
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: "Votre compte est bloqué" });
        }
        
        user.lastLogin = new Date();
        await user.save();

        const token = jwt.sign({ userId: user._id, email: user.email, type: user.typeUtilisateur }, JWT_SECRET, { expiresIn: "24h" });

        const userResponse = user.toObject();
        delete userResponse.pwd;
        delete userResponse.pwdTemporaire;

        if (userResponse.photo) {
            userResponse.photoUrl = `${BASE_URL}/${userResponse.photo.replace(/\\/g, '/')}`;
        }

        res.json({ success: true, message: "Connexion réussie", data: { token, user: userResponse } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const logout = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(400).json({ success: false, message: 'Token requis pour la déconnexion' });

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            if (tokenBlacklist.has(token)) {
                return res.status(400).json({ success: false, message: 'Vous êtes déjà déconnecté' });
            }

            tokenBlacklist.add(token);
            console.log(`Déconnexion - UserID: ${decoded.userId}`);

            res.json({ success: true, message: 'Déconnexion réussie' });
        } catch (jwtError) {
            return res.status(401).json({ success: false, message: 'Token invalide' });
        }

    } catch (error) {
        console.error('Erreur logout:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
    }
};

// =================== CRUD DE BASE ===================
const addAccount = async (req, res) => {
    try {
        const userData = req.body;

        const existingUser = await User.findOne({
            $or: [{ email: userData.email }, { NcarteIdentite: userData.NcarteIdentite }],
        });

        if (existingUser) {
            return res.status(409).json({ success: false, message: "Email ou numéro de carte d'identité déjà utilisé" });
        }

        const newUser = new User(userData);
        await newUser.save();

        const userResponse = newUser.toObject();
        delete userResponse.pwd;
        delete userResponse.pwdTemporaire;

        res.status(201).json({ success: true, message: "Compte créé avec succès", data: userResponse });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, message: "Données invalides", errors: Object.values(error.errors).map((e) => e.message) });
        }
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const updateAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { pwd, pwdTemporaire, numeroCompte, NcarteIdentite, dateNaissance, ...updateData } = req.body; 
        
        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }

        // Vérification des permissions
        const isOwnAccount = req.user._id.toString() === id;
        const isAdminOrAgent = ['ADMIN', 'AGENT'].includes(req.user.typeUtilisateur);
        
        if (!isOwnAccount && !isAdminOrAgent) {
            return res.status(403).json({ success: false, message: "Vous n'avez pas la permission de modifier ce compte" });
        }

        // Si c'est un client qui modifie son propre compte, il ne peut pas changer certains champs
        if (req.user.typeUtilisateur === "CLIENT" && isOwnAccount) {
            delete updateData.typeUtilisateur;
            delete updateData.isBlocked;
        }

        const updatedUser = await User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
            select: "-pwd -pwdTemporaire"
        });

        const userResponse = updatedUser.toObject();
        if (userResponse.photo) {
            userResponse.photoUrl = `${BASE_URL}/${userResponse.photo.replace(/\\/g, '/')}`;
        }

        res.json({ success: true, message: "Compte mis à jour avec succès", data: userResponse });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, message: "Données invalides", errors: Object.values(error.errors).map((e) => e.message) });
        }
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }

        // Supprimer la photo si elle existe
        if (user.photo) {
            try {
                await fs.unlink(user.photo);
            } catch (err) {
                console.warn('Erreur suppression photo:', err);
            }
        }

        res.json({ success: true, message: "Compte supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", type = "" } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { nom: { $regex: search, $options: "i" } },
                { prenom: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { NcarteIdentite: { $regex: search, $options: "i" } },
            ];
        }
        if (type) query.typeUtilisateur = type;

        const limitInt = parseInt(limit);
        const pageInt = parseInt(page);
        
        let users = await User.find(query)
            .select("-pwd -pwdTemporaire")
            .sort({ dateCreation: -1 })
            .limit(limitInt)
            .skip((pageInt - 1) * limitInt);

        users = users.map(user => {
            const userObj = user.toObject();
            if (userObj.photo) {
                userObj.photoUrl = `${BASE_URL}/${userObj.photo.replace(/\\/g, '/')}`;
            }
            return userObj;
        });

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                totalPages: Math.ceil(total / limitInt),
                currentPage: pageInt,
                total,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-pwd -pwdTemporaire");

        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }
        
        const userResponse = user.toObject();
        if (userResponse.photo) {
            userResponse.photoUrl = `${BASE_URL}/${userResponse.photo.replace(/\\/g, '/')}`;
        }
        
        res.json({ success: true, data: userResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

// =================== ACTIONS ADMIN ===================
const blockUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: 'ID utilisateur invalide' });

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

        if (user.isBlocked) return res.status(400).json({ success: false, message: 'Utilisateur déjà bloqué' });

        if (user.typeUtilisateur === 'ADMIN' && req.user.typeUtilisateur !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Seul un administrateur peut bloquer un autre administrateur' });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Vous ne pouvez pas vous bloquer vous-même' });
        }

        user.isBlocked = true;
        await user.save();

        res.json({ success: true, message: 'Utilisateur bloqué avec succès', data: { id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, isBlocked: user.isBlocked } });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

const unblockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndUpdate(id, { isBlocked: false }, { new: true, select: "-pwd -pwdTemporaire" });
        
        if (!user) {
            return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
        }
        res.json({ success: true, message: "Utilisateur débloqué avec succès", data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const blockMultipleUsers = async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, message: "Liste d'IDs utilisateurs requise" });
        }
        const result = await User.updateMany({ _id: { $in: userIds } }, { isBlocked: true });
        res.json({ success: true, message: `${result.modifiedCount} utilisateurs bloqués avec succès`, data: { blockedCount: result.modifiedCount } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

const deleteMultipleUsers = async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ success: false, message: "Liste d'IDs utilisateurs requise" });
        }
        const result = await User.deleteMany({ _id: { $in: userIds } });
        res.json({ success: true, message: `${result.deletedCount} utilisateurs supprimés avec succès`, data: { deletedCount: result.deletedCount } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Erreur serveur", error: error.message });
    }
};

// =================== PROFIL UTILISATEUR ===================
const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select("-pwd -pwdTemporaire");

        if (!user) {
            return res.status(404).json({ success: false, message: "Profil utilisateur non trouvé" });
        }

        const userResponse = user.toObject();
        if (userResponse.photo) {
            userResponse.photoUrl = `${BASE_URL}/${userResponse.photo.replace(/\\/g, '/')}`;
        }
        
        res.json({ success: true, data: userResponse });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

const updateProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            if (req.fileError) {
                 return res.status(400).json({ success: false, message: req.fileError.message });
            }
            return res.status(400).json({ success: false, message: 'Aucun fichier fourni.' });
        }

        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

        // Supprimer l'ancienne photo si elle existe
        if (user.photo) {
            try {
                await fs.unlink(user.photo);
            } catch (err) {
                console.warn(`Ancienne photo non trouvée ou erreur de suppression: ${user.photo}`);
            }
        }

        user.photo = req.file.path;
        await user.save();
        
        const photoUrl = `${BASE_URL}/${user.photo.replace(/\\/g, '/')}`;

        res.json({ success: true, message: 'Photo de profil mise à jour', data: { photoUrl } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour de la photo', error: error.message });
    }
};

const deleteProfilePicture = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

        if (user.photo) {
            try {
                await fs.unlink(user.photo);
            } catch (err) {
                console.warn('Erreur suppression photo:', err);
            }
            
            user.photo = null;
            await user.save();
        }

        res.json({ success: true, message: 'Photo de profil supprimée', data: { photoUrl: null } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la suppression de la photo', error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { nom, prenom, tel, adresse, email, ...forbiddenFields } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

        if (email && email !== user.email) {
            if (await User.findOne({ email })) {
                return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
            }
            user.email = email;
        }
        
        const fieldsToUpdate = { nom, prenom, tel, adresse };
        Object.keys(fieldsToUpdate).forEach(key => {
            if (fieldsToUpdate[key] !== undefined) {
                user[key] = fieldsToUpdate[key];
            }
        });

        await user.save({ runValidators: true });

        const userResponse = user.toObject();
        delete userResponse.pwd;
        delete userResponse.pwdTemporaire;

        if (userResponse.photo) {
            userResponse.photoUrl = `${BASE_URL}/${userResponse.photo.replace(/\\/g, '/')}`;
        }

        res.json({ success: true, message: 'Profil mis à jour avec succès', data: userResponse });
    } catch (error) {
         if (error.name === "ValidationError") {
            return res.status(400).json({ success: false, message: "Données de profil invalides", errors: Object.values(error.errors).map((e) => e.message) });
        }
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
};

// =================== EXPORTATIONS ===================
module.exports = {
    login,
    logout,
    addAccount,
    updateAccount,
    deleteAccount,
    blockUser,
    unblockUser,
    blockMultipleUsers,
    deleteMultipleUsers,
    getUsers,
    getUserById,
    getProfile,
    updateProfile,
    updateProfilePicture,
    deleteProfilePicture,
    uploadMiddleware, 
    isTokenBlacklisted
};