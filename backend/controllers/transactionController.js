const Transaction = require('../models/Transaction');
const Compte = require('../models/Compte');

// Effectuer une transaction (dépôt ou retrait)
const createTransaction = async (req, res) => {
  try {
    const {
      typeTransaction,
      montant,
      compteSource,
      compteDestination,
      numeroCompteAgent,
      numeroCompteDistributeur,
      description
    } = req.body;

    // Validation
    if (!montant || montant <= 0) {
      throw new Error('Montant invalide');
    }

    // Calculer la commission (2.5%)
    const commission = montant * 0.025;

    // Vérifier les comptes
    const compteSourceObj = await Compte.findOne({ numeroCompte: compteSource });
    if (!compteSourceObj) {
      throw new Error('Compte source non trouvé');
    }

    if (typeTransaction === 'RETRAIT') {
      if (compteSourceObj.solde < montant) {
        throw new Error('Solde insuffisant');
      }
      compteSourceObj.solde -= montant;
    } else if (typeTransaction === 'DEPOT') {
      compteSourceObj.solde += montant;
    }

    await compteSourceObj.save();

    // Créer la transaction
    const transaction = new Transaction({
      typeTransaction,
      montant,
      compteSource,
      compteDestination,
      numeroCompteAgent,
      numeroCompteDistributeur,
      commission,
      description,
      statut: 'VALIDEE'
    });

    await transaction.save();

    // Mettre à jour le compte agent (commission)
    const compteAgent = await Compte.findOne({ numeroCompte: numeroCompteAgent });
    if (compteAgent) {
      compteAgent.solde += commission * 0.4; // 40% de la commission
      await compteAgent.save();
    }

    // Mettre à jour le compte distributeur (commission)
    const compteDistributeur = await Compte.findOne({ numeroCompte: numeroCompteDistributeur });
    if (compteDistributeur) {
      compteDistributeur.solde += commission * 0.6; // 60% de la commission
      await compteDistributeur.save();
    }

    res.status(201).json({
      success: true,
      message: 'Transaction effectuée avec succès',
      data: transaction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Récupérer toutes les transactions
const getTransactions = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      typeTransaction, 
      compteSource,
      dateDebut,
      dateFin,
      statut
    } = req.query;

    let query = {};
    
    if (typeTransaction) query.typeTransaction = typeTransaction;
    if (compteSource) query.compteSource = compteSource;
    if (statut) query.statut = statut;
    
    if (dateDebut || dateFin) {
      query.dateTransaction = {};
      if (dateDebut) query.dateTransaction.$gte = new Date(dateDebut);
      if (dateFin) query.dateTransaction.$lte = new Date(dateFin);
    }

    const transactions = await Transaction.find(query)
      .sort({ dateTransaction: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    // Enrichir avec les informations des comptes
    const enrichedTransactions = await Promise.all(
      transactions.map(async (transaction) => {
        const compteSource = await Compte.findOne({ numeroCompte: transaction.compteSource })
          .populate('userId', 'nom prenom');
        
        return {
          ...transaction.toObject(),
          nomClient: compteSource?.userId ? `${compteSource.userId.prenom} ${compteSource.userId.nom}` : 'N/A'
        };
      })
    );

    res.json({
      success: true,
      data: {
        transactions: enrichedTransactions,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Statistiques des transactions
const getTransactionStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Transaction.aggregate([
      {
        $facet: {
          today: [
            { $match: { dateTransaction: { $gte: today }, statut: 'VALIDEE' } },
            { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$montant' } } }
          ],
          byType: [
            { $match: { statut: 'VALIDEE' } },
            { $group: { _id: '$typeTransaction', count: { $sum: 1 }, volume: { $sum: '$montant' } } }
          ],
          total: [
            { $match: { statut: 'VALIDEE' } },
            { $group: { _id: null, count: { $sum: 1 }, volume: { $sum: '$montant' } } }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        transactionsToday: stats[0].today[0]?.count || 0,
        volumeToday: stats[0].today[0]?.volume || 0,
        totalTransactions: stats[0].total[0]?.count || 0,
        volumeTotal: stats[0].total[0]?.volume || 0,
        byType: stats[0].byType
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Annuler une transaction
const cancelTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      throw new Error('Transaction non trouvée');
    }

    if (transaction.statut !== 'VALIDEE') {
      throw new Error('Cette transaction ne peut pas être annulée');
    }

    // Inverser l'opération sur le compte
    const compte = await Compte.findOne({ numeroCompte: transaction.compteSource });
    if (compte) {
      if (transaction.typeTransaction === 'DEPOT') {
        compte.solde -= transaction.montant;
      } else if (transaction.typeTransaction === 'RETRAIT') {
        compte.solde += transaction.montant;
      }
      await compte.save();
    }

    transaction.statut = 'ANNULEE';
    transaction.description += ` | Annulée: ${raison || 'Non spécifiée'}`;
    await transaction.save();

    res.json({
      success: true,
      message: 'Transaction annulée avec succès',
      data: transaction
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionStats,
  cancelTransaction
};