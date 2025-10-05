const express = require("express");
const router = express.Router();

const {
  authenticateToken,
  requireAgentOrAdmin,
} = require("../middleware/auth");

const {
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
  updateProfilePicture,
  deleteProfilePicture,
  updateProfile,
  uploadMiddleware  // ✅ AJOUTÉ
} = require("../controllers/userController");

// =================== Routes publiques ===================
router.post("/login", login);
router.post("/register", addAccount);
router.post("/logout", logout);

// =================== Routes protégées ===================
router.use(authenticateToken);

// =================== Routes PROFILE (AVANT /:id) ===================
// ✅ Routes /profile définies AVANT /:id pour éviter les conflits
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.post('/profile/photo', (req, res, next) => {
    uploadMiddleware(req, res, function (err) {
        if (err) {
            req.fileError = err; 
        }
        next();
    });
}, updateProfilePicture);
router.delete('/profile/photo', deleteProfilePicture);

// =================== Routes utilisateurs ===================
router.get("/", requireAgentOrAdmin, getUsers);
router.get("/:id", getUserById);  // ✅ Maintenant après /profile
router.put("/:id", updateAccount);

// =================== Routes agents/admins ===================
router.delete("/delete/:id", requireAgentOrAdmin, deleteAccount);  // ✅ Corrigé: /delete/:id
router.patch("/block/:id", requireAgentOrAdmin, blockUser);
router.patch("/debloquer/:id", requireAgentOrAdmin, unblockUser);
router.patch("/mulblock", requireAgentOrAdmin, blockMultipleUsers);
router.delete("/muldelete", requireAgentOrAdmin, deleteMultipleUsers);

module.exports = router;