import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Depot = () => {
  const [distributeurs, setDistributeurs] = useState([]);
  const [selectedDistributeur, setSelectedDistributeur] = useState(null);
  const [compteDistributeur, setCompteDistributeur] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDistributeurs, setLoadingDistributeurs] = useState(true);

  const currentUser = apiService.auth.getCurrentUser();

  useEffect(() => {
    loadDistributeurs();
  }, []);

  const loadDistributeurs = async () => {
    setLoadingDistributeurs(true);
    try {
      const response = await apiService.users.getAll({ type: 'DISTRIBUTEUR' });
      if (response && response.users) {
        setDistributeurs(response.users.filter(u => !u.isBlocked));
      }
    } catch (err) {
      console.error('Erreur chargement distributeurs:', err);
    } finally {
      setLoadingDistributeurs(false);
    }
  };

  const filteredDistributeurs = distributeurs.filter(dist => {
    const search = searchTerm.toLowerCase();
    return (
      dist.nom?.toLowerCase().includes(search) ||
      dist.prenom?.toLowerCase().includes(search) ||
      dist.email?.toLowerCase().includes(search) ||
      dist.numeroCompte?.toLowerCase().includes(search)
    );
  });

  const validate = () => {
    const newErrors = {};

    if (!selectedDistributeur) {
      newErrors.distributeur = "Veuillez sélectionner un distributeur.";
    }

    if (!compteDistributeur) {
      newErrors.compte = "Impossible de récupérer le compte du distributeur.";
    }

    if (!amount) {
      newErrors.amount = "Le montant est requis.";
    } else if (isNaN(amount) || parseFloat(amount) <= 0) {
      newErrors.amount = "Le montant doit être un nombre positif.";
    } else if (parseFloat(amount) < 100) {
      newErrors.amount = "Le montant minimum est de 100 FCFA.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSelectDistributeur = async (dist) => {
    setSelectedDistributeur(dist);
    setSearchTerm('');
    setErrors({ ...errors, distributeur: '' });

    // Récupérer ou créer le compte du distributeur
    try {
      const comptesResponse = await apiService.comptes.getAll({
        userId: dist._id,
        typeCompte: 'DISTRIBUTEUR'
      });

      if (comptesResponse && comptesResponse.length > 0) {
        setCompteDistributeur(comptesResponse[0]);
      } else {
        // Créer un compte pour ce distributeur
        const newCompte = await apiService.comptes.create({
          userId: dist._id,
          typeCompte: 'DISTRIBUTEUR'
        });
        setCompteDistributeur(newCompte.data);
      }
    } catch (err) {
      console.error('Erreur récupération compte:', err);
      setErrors({ ...errors, compte: 'Erreur lors de la récupération du compte' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    
    if (!validate()) return;

    setLoading(true);
    try {
      // Créer la transaction de dépôt
      const transactionData = {
        typeTransaction: 'DEPOT',
        montant: parseFloat(amount),
        compteSource: compteDistributeur.numeroCompte,
        compteDestination: null,
        numeroCompteAgent: currentUser.numeroCompte || 'AGENT001',
        numeroCompteDistributeur: compteDistributeur.numeroCompte,
        description: description || `Dépôt de ${parseFloat(amount).toLocaleString()} FCFA`
      };

      console.log('Données transaction:', transactionData);

      const response = await apiService.transactions.create(transactionData);

      if (response.success) {
        setSuccess(
          `Dépôt de ${parseFloat(amount).toLocaleString()} FCFA effectué avec succès vers ${selectedDistributeur.prenom} ${selectedDistributeur.nom}. ` +
          `Transaction N° ${response.data.numeroTransaction}`
        );
        
        // Réinitialiser le formulaire
        setSelectedDistributeur(null);
        setCompteDistributeur(null);
        setSearchTerm('');
        setAmount('');
        setDescription('');
        setErrors({});

        // Recharger les distributeurs pour mettre à jour les soldes
        setTimeout(() => loadDistributeurs(), 1000);
      }
      
    } catch (err) {
      console.error('Erreur dépôt:', err);
      setErrors({ submit: err.message || 'Erreur lors du dépôt' });
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedDistributeur(null);
    setCompteDistributeur(null);
    setSearchTerm('');
  };

  return (
    <div className="container-fluid py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          {/* En-tête */}
          <div className="card custom-card mb-4">
            <div className="card-body">
              <h2 className="mb-2 d-flex align-items-center gap-2">
                <i className="bi bi-wallet2 text-primary"></i>
                Dépôt vers un distributeur
              </h2>
              <p className="text-muted mb-0">
                Effectuer un dépôt d'argent sur le compte d'un distributeur
              </p>
            </div>
          </div>

          {/* Formulaire de dépôt */}
          <div className="card custom-card">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Sélection du distributeur */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-person-check me-2"></i>
                    Sélectionner un distributeur *
                  </label>
                  
                  {selectedDistributeur ? (
                    <div className="alert alert-info d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                             style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                          {selectedDistributeur.prenom?.charAt(0)}{selectedDistributeur.nom?.charAt(0)}
                        </div>
                        <div>
                          <div className="fw-bold">{selectedDistributeur.prenom} {selectedDistributeur.nom}</div>
                          <small className="text-muted">{selectedDistributeur.email}</small>
                          <div>
                            <small className="badge bg-secondary me-1">{selectedDistributeur.numeroCompte}</small>
                            {compteDistributeur && (
                              <small className="badge bg-success">
                                Solde: {compteDistributeur.solde?.toLocaleString() || 0} FCFA
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={handleClearSelection}
                      >
                        <i className="bi bi-x-lg"></i> Changer
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        className={`form-control ${errors.distributeur ? 'is-invalid' : ''}`}
                        placeholder="Rechercher par nom, email ou numéro de compte..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {errors.distributeur && <div className="invalid-feedback">{errors.distributeur}</div>}

                      {searchTerm && (
                        <div className="border rounded mt-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                          {loadingDistributeurs ? (
                            <div className="text-center py-3">
                              <div className="spinner-border spinner-border-sm text-primary"></div>
                            </div>
                          ) : filteredDistributeurs.length > 0 ? (
                            filteredDistributeurs.map(dist => (
                              <div
                                key={dist._id}
                                className="p-3 border-bottom cursor-pointer hover-bg-light"
                                onClick={() => handleSelectDistributeur(dist)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div className="d-flex align-items-center gap-3">
                                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" 
                                       style={{ width: '40px', height: '40px' }}>
                                    {dist.prenom?.charAt(0)}{dist.nom?.charAt(0)}
                                  </div>
                                  <div className="flex-grow-1">
                                    <div className="fw-semibold">{dist.prenom} {dist.nom}</div>
                                    <small className="text-muted d-block">{dist.email}</small>
                                    <small className="badge bg-secondary">{dist.numeroCompte}</small>
                                  </div>
                                  <i className="bi bi-chevron-right text-muted"></i>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-3 text-muted">
                              <i className="bi bi-search"></i> Aucun distributeur trouvé
                            </div>
                          )}
                        </div>
                      )}

                      {!searchTerm && !loadingDistributeurs && (
                        <small className="text-muted d-block mt-2">
                          <i className="bi bi-info-circle me-1"></i>
                          {distributeurs.length} distributeur(s) disponible(s)
                        </small>
                      )}
                    </>
                  )}
                </div>

                {/* Montant */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-cash-stack me-2"></i>
                    Montant à déposer (FCFA) *
                  </label>
                  <input
                    type="number"
                    className={`form-control form-control-lg ${errors.amount ? 'is-invalid' : ''}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 50000"
                    min="100"
                    step="100"
                  />
                  {errors.amount && <div className="invalid-feedback">{errors.amount}</div>}
                  <small className="text-muted">Montant minimum: 100 FCFA</small>
                </div>

                {/* Description (optionnel) */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    <i className="bi bi-card-text me-2"></i>
                    Description (optionnel)
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Dépôt mensuel..."
                  />
                </div>

                {/* Récapitulatif */}
                {selectedDistributeur && amount && parseFloat(amount) > 0 && (
                  <div className="alert alert-light border">
                    <h6 className="fw-bold mb-3">Récapitulatif</h6>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Destinataire:</span>
                      <strong>{selectedDistributeur.prenom} {selectedDistributeur.nom}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Compte:</span>
                      <strong>{compteDistributeur?.numeroCompte || 'N/A'}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span>Commission (2.5%):</span>
                      <strong>{(parseFloat(amount) * 0.025).toLocaleString()} FCFA</strong>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between">
                      <span className="fw-bold">Montant total:</span>
                      <span className="fw-bold fs-5 text-primary">
                        {parseFloat(amount).toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                )}

                {/* Messages */}
                {errors.submit && (
                  <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {errors.submit}
                  </div>
                )}

                {success && (
                  <div className="alert alert-success">
                    <i className="bi bi-check-circle me-2"></i>
                    {success}
                  </div>
                )}

                {/* Boutons */}
                <div className="d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg flex-grow-1"
                    disabled={loading || !selectedDistributeur || !amount}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Traitement...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-wallet2 me-2"></i>
                        Effectuer le dépôt
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary btn-lg"
                    onClick={() => {
                      setSelectedDistributeur(null);
                      setCompteDistributeur(null);
                      setSearchTerm('');
                      setAmount('');
                      setDescription('');
                      setErrors({});
                      setSuccess('');
                    }}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Depot;