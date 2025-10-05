const express = require('express');
const router = express.Router();
const { authenticateToken, requireAgentOrAdmin } = require('../middleware/auth');
const {
  createCompte,
  getComptes,
  getCompteByNumero,
  updateSolde
} = require('../controllers/compteController');

router.use(authenticateToken);

router.post('/', requireAgentOrAdmin, createCompte);
router.get('/', getComptes);
router.get('/:numeroCompte', getCompteByNumero);
router.patch('/:numeroCompte/solde', requireAgentOrAdmin, updateSolde);

module.exports = router;