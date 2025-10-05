const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  numeroTransaction: {
    type: String,
    unique: true
  },
  typeTransaction: {
    type: String,
    enum: ['DEPOT', 'RETRAIT', 'TRANSFERT'],
    required: true
  },
  montant: {
    type: Number,
    required: true,
    min: 0
  },
  compteSource: {
    type: String,
    required: true
  },
  compteDestination: {
    type: String,
    default: null
  },
  numeroCompteAgent: {
    type: String,
    required: true
  },
  numeroCompteDistributeur: {
    type: String,
    required: true
  },
  commission: {
    type: Number,
    default: 0
  },
  statut: {
    type: String,
    enum: ['EN_ATTENTE', 'VALIDEE', 'REJETEE', 'ANNULEE'],
    default: 'VALIDEE'
  },
  description: {
    type: String,
    default: ''
  },
  dateTransaction: {
    type: Date,
    default: Date.now
  },
  heureTransaction: {
    type: String,
    default: function() {
      return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
  }
}, { timestamps: true });

// Générer numéro de transaction AVANT la validation
transactionSchema.pre('validate', function(next) {
  if (!this.numeroTransaction) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.numeroTransaction = `TX${timestamp}${random}`;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);