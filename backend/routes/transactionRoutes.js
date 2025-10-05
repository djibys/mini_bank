const express = require('express');
const router = express.Router();
const { authenticateToken, requireAgentOrAdmin } = require('../middleware/auth');
const {
  createTransaction,
  getTransactions,
  getTransactionStats,
  cancelTransaction
} = require('../controllers/transactionController');

router.use(authenticateToken);

router.post('/', requireAgentOrAdmin, createTransaction);
router.get('/', getTransactions);
router.get('/stats', getTransactionStats);
router.patch('/:id/cancel', requireAgentOrAdmin, cancelTransaction);

module.exports = router;