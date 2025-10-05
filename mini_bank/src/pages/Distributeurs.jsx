import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';
import DistributeurModal from '../components/ui/DistributeurModal';

const Distributeurs = () => {
  const [distributeurs, setDistributeurs] = useState([]);
  const [filteredDistributeurs, setFilteredDistributeurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDistributeur, setSelectedDistributeur] = useState(null);

  useEffect(() => {
    loadDistributeurs();
  }, []);

  const loadDistributeurs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Utiliser l'API users avec le type DISTRIBUTEUR
      const response = await apiService.users.getAll({ type: 'DISTRIBUTEUR' });
      
      if (response && response.users) {
        // Adapter les données au format attendu par le composant
        const adaptedDistributeurs = response.users.map(user => ({
          id: user._id,
          nom: `${user.prenom} ${user.nom}`,
          prenom: user.prenom,
          nomFamille: user.nom,
          telephone: user.tel || 'N/A',
          zone: user.adresse || 'N/A',
          email: user.email,
          numeroCompte: user.numeroCompte,
          isBlocked: user.isBlocked || false,
          transactions: 0, // À calculer depuis les transactions si nécessaire
          commission: 0 // À calculer depuis les transactions si nécessaire
        }));
        
        setDistributeurs(adaptedDistributeurs);
        setFilteredDistributeurs(adaptedDistributeurs);
      }
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
      const filtered = distributeurs.filter(dist =>
        dist.nom.toLowerCase().includes(value.toLowerCase()) ||
        dist.zone.toLowerCase().includes(value.toLowerCase()) ||
        dist.telephone.includes(value) ||
        dist.email.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredDistributeurs(filtered);
    } else {
      setFilteredDistributeurs(distributeurs);
    }
  };

  const handleCreate = async (formData) => {
    try {
      // Créer un utilisateur de type DISTRIBUTEUR
      await apiService.users.create({
        ...formData,
        typeUtilisateur: 'DISTRIBUTEUR'
      });
      setShowModal(false);
      loadDistributeurs();
      alert('Distributeur créé avec succès!');
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await apiService.users.update(selectedDistributeur.id, formData);
      setShowModal(false);
      setSelectedDistributeur(null);
      loadDistributeurs();
      alert('Distributeur mis à jour avec succès!');
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const handleDelete = async (id, nom) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${nom} ?`)) {
      try {
        await apiService.users.delete(id);
        loadDistributeurs();
        alert('Distributeur supprimé avec succès!');
      } catch (err) {
        alert(`Erreur: ${err.message}`);
      }
    }
  };

  const handleBlock = async (id, nom, isBlocked) => {
    const action = isBlocked ? 'débloquer' : 'bloquer';
    if (window.confirm(`Voulez-vous ${action} ${nom} ?`)) {
      try {
        if (isBlocked) {
          await apiService.users.unblock(id);
        } else {
          await apiService.users.block(id);
        }
        loadDistributeurs();
        alert(`Distributeur ${action === 'bloquer' ? 'bloqué' : 'débloqué'} avec succès!`);
      } catch (err) {
        alert(`Erreur: ${err.message}`);
      }
    }
  };

  const openEditModal = (distributeur) => {
    setSelectedDistributeur(distributeur);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDistributeur(null);
  };

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-2">Gestion des Distributeurs</h2>
          <p className="text-muted">Gérez vos distributeurs et leurs commissions</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <i className="bi bi-person-plus-fill me-2"></i>
          Nouveau distributeur
        </button>
      </div>

      {/* Barre de recherche et statistiques */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card custom-card">
            <div className="card-body">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par nom, zone, téléphone ou email..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card custom-card bg-primary text-white">
            <div className="card-body text-center">
              <h3 className="fw-bold mb-1">{distributeurs.length}</h3>
              <small>Distributeurs actifs</small>
            </div>
          </div>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="alert alert-danger mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Grille des distributeurs */}
      {loading && distributeurs.length === 0 ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
        </div>
      ) : filteredDistributeurs.length === 0 ? (
        <div className="card custom-card">
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-inbox fs-1 mb-3 d-block"></i>
            <p>Aucun distributeur trouvé</p>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredDistributeurs.map((distributeur) => (
            <div key={distributeur.id} className="col-xl-4 col-lg-6">
              <div className="card custom-card h-100">
                <div className="card-body">
                  {/* En-tête de la carte */}
                  <div className="text-center mb-4 pb-4 border-bottom">
                    <div 
                      className="bg-primary text-white rounded-circle mx-auto d-flex align-items-center justify-content-center fw-bold mb-3" 
                      style={{width: '90px', height: '90px', fontSize: '2rem'}}
                    >
                      {distributeur.prenom?.charAt(0)}{distributeur.nomFamille?.charAt(0)}
                    </div>
                    <h5 className="fw-bold mb-2">{distributeur.nom}</h5>
                    <p className="text-muted mb-1">
                      <i className="bi bi-envelope me-2"></i>
                      {distributeur.email}
                    </p>
                    <p className="text-muted mb-1">
                      <i className="bi bi-telephone me-2"></i>
                      {distributeur.telephone}
                    </p>
                    <p className="text-muted mb-0">
                      <i className="bi bi-geo-alt me-2"></i>
                      {distributeur.zone}
                    </p>
                    {distributeur.numeroCompte && (
                      <p className="text-muted small mb-0 mt-2">
                        <i className="bi bi-credit-card me-2"></i>
                        {distributeur.numeroCompte}
                      </p>
                    )}
                    {distributeur.isBlocked && (
                      <span className="badge bg-danger mt-2">
                        <i className="bi bi-lock-fill me-1"></i>
                        Bloqué
                      </span>
                    )}
                  </div>

                  {/* Statistiques */}
                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="bg-light rounded p-3 text-center">
                        <div className="text-muted small mb-2">Transactions</div>
                        <div className="fw-bold fs-4 text-primary">{distributeur.transactions}</div>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="bg-light rounded p-3 text-center">
                        <div className="text-muted small mb-2">Taux</div>
                        <div className="fw-bold fs-4 text-success">1%</div>
                      </div>
                    </div>
                  </div>

                  {/* Commission */}
                  <div className="bg-success bg-opacity-10 rounded p-3 mb-4">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <small className="text-muted d-block mb-1">Commission totale</small>
                        <span className="fw-bold text-success fs-4">
                          {distributeur.commission.toLocaleString()} 
                          <small className="text-muted ms-1">FCFA</small>
                        </span>
                      </div>
                      <i className="bi bi-cash-stack text-success fs-1"></i>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-outline-primary flex-fill btn-sm"
                      onClick={() => openEditModal(distributeur)}
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Modifier
                    </button>
                    <button 
                      className={`btn btn-outline-${distributeur.isBlocked ? 'success' : 'warning'} btn-sm`}
                      onClick={() => handleBlock(distributeur.id, distributeur.nom, distributeur.isBlocked)}
                    >
                      <i className={`bi bi-${distributeur.isBlocked ? 'unlock' : 'lock'}-fill me-1`}></i>
                      {distributeur.isBlocked ? 'Débloquer' : 'Bloquer'}
                    </button>
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(distributeur.id, distributeur.nom)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <DistributeurModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={selectedDistributeur ? handleUpdate : handleCreate}
        distributeur={selectedDistributeur}
      />
    </div>
  );
};

export default Distributeurs;