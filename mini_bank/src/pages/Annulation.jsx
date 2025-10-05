import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Annulation = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [raison, setRaison] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.transactions.getAll({ statut: 'VALIDEE' });
      setTransactions(data.transactions || []);
      setFilteredTransactions(data.transactions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      const filtered = transactions.filter(t =>
        t.numeroTransaction.toLowerCase().includes(value.toLowerCase()) ||
        (t.nomClient && t.nomClient.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  };

  const openCancelModal = (transaction) => {
    setSelectedTransaction(transaction);
    setRaison('');
    setShowModal(true);
  };

  const handleCancel = async () => {
    if (!raison.trim()) {
      alert('Veuillez indiquer la raison de l\'annulation');
      return;
    }

    try {
      const response = await apiService.transactions.cancel(selectedTransaction._id, raison);
      if (response.success) {
        alert('Transaction annulée avec succès');
        setShowModal(false);
        loadTransactions();
      }
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    }
  };

  const getStatusBadge = (statut) => {
    const badges = {
      'VALIDEE': 'bg-success',
      'EN_ATTENTE': 'bg-warning text-dark',
      'ANNULEE': 'bg-danger',
      'REJETEE': 'bg-secondary'
    };
    return <span className={`badge ${badges[statut] || 'bg-secondary'}`}>{statut}</span>;
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-2">Gestion des Annulations</h2>
          <p className="text-muted">Annuler des transactions validées</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
            <div className="input-group" style={{ maxWidth: '400px' }}>
              <span className="input-group-text">
                <i className="bi bi-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Rechercher par ID de transaction ou client..." 
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>

            <button className="btn btn-outline-primary" onClick={loadTransactions}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Rafraîchir
            </button>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-semibold">
          Transactions Validées ({filteredTransactions.length})
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-hover mb-0">
                <thead>
                  <tr>
                    <th>ID Transaction</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map(transaction => (
                      <tr key={transaction._id}>
                        <td className="fw-bold text-primary">{transaction.numeroTransaction}</td>
                        <td>{transaction.nomClient || 'N/A'}</td>
                        <td>
                          <span className={`badge ${transaction.typeTransaction === 'DEPOT' ? 'bg-success' : 'bg-danger'}`}>
                            {transaction.typeTransaction}
                          </span>
                        </td>
                        <td className="fw-bold">{transaction.montant.toLocaleString()} FCFA</td>
                        <td>{new Date(transaction.dateTransaction).toLocaleDateString('fr-FR')}</td>
                        <td>{getStatusBadge(transaction.statut)}</td>
                        <td className="text-center">
                          {transaction.statut === 'VALIDEE' && (
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => openCancelModal(transaction)}
                              title="Annuler"
                            >
                              <i className="bi bi-x-circle me-1"></i>
                              Annuler
                            </button>
                          )}
                          {transaction.statut !== 'VALIDEE' && (
                            <button className="btn btn-sm btn-outline-secondary" disabled>
                              <i className="bi bi-info-circle"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        <i className="bi bi-inbox fs-1 mb-3 d-block"></i>
                        <p>Aucune transaction trouvée</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'annulation */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Annuler la transaction</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Cette action est irréversible. Le montant sera recrédité/débité.
                </div>
                <div className="mb-3">
                  <strong>Transaction:</strong> {selectedTransaction?.numeroTransaction}
                </div>
                <div className="mb-3">
                  <strong>Montant:</strong> {selectedTransaction?.montant.toLocaleString()} FCFA
                </div>
                <div className="mb-3">
                  <label className="form-label">Raison de l'annulation *</label>
                  <textarea 
                    className="form-control" 
                    rows="3" 
                    value={raison}
                    onChange={(e) => setRaison(e.target.value)}
                    placeholder="Expliquez la raison de l'annulation..."
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="button" className="btn btn-danger" onClick={handleCancel}>
                  <i className="bi bi-check-lg me-2"></i>
                  Confirmer l'annulation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Annulation;