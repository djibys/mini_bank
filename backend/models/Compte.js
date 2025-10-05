const mongoose = require('mongoose');

const compteSchema = new mongoose.Schema({
  numeroCompte: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  typeCompte: {
    type: String,
    enum: ['CLIENT', 'AGENT', 'DISTRIBUTEUR'],
    required: true
  },
  solde: {
    type: Number,
    default: 0,
    min: 0
  },
  numeroCompteAgent: {
    type: String,
    default: null
  },
  numeroCompteDistributeur: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  derniereTransaction: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Index pour recherche rapide
compteSchema.index({ userId: 1, typeCompte: 1 });

module.exports = mongoose.model('Compte', compteSchema);