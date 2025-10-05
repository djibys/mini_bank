import React, { useEffect, useState } from 'react';
import apiService from '../services/apiService';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal nouveau client
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    tel: '',
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Charger les clients au montage
  useEffect(() => {
    loadClients();
  }, []);

  // Filtrer les clients quand search ou filterStatus change
  useEffect(() => {
    filterClients();
  }, [searchTerm, filterStatus, clients]);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.users.getAll({
        type: 'CLIENT'
      });
      
      // Adapter les données au format attendu
      const adaptedClients = response.users.map(user => ({
        id: user._id,
        nom: `${user.prenom} ${user.nom}`,
        prenom: user.prenom,
        nomFamille: user.nom,
        telephone: user.tel,
        email: user.email || 'Non renseigné',
        solde: user.solde || 0,
        status: user.isBlocked ? 'Inactif' : 'Actif',
        isBlocked: user.isBlocked,
        createdAt: user.createdAt
      }));
      
      setClients(adaptedClients);
    } catch (err) {
      setError(err.message);
      console.error('Erreur chargement clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    let filtered = [...clients];

    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telephone.includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrer par statut
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => 
        client.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    setFilteredClients(filtered);
    setCurrentPage(1); // Reset à la page 1 après filtrage
  };

  const handleDelete = async (id, nom) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${nom} ?`)) {
      try {
        await apiService.users.delete(id);
        await loadClients(); // Recharger la liste
        alert('Client supprimé avec succès');
      } catch (err) {
        alert(`Erreur lors de la suppression: ${err.message}`);
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
        await loadClients();
        alert(`Client ${action === 'bloquer' ? 'bloqué' : 'débloqué'} avec succès`);
      } catch (err) {
        alert(`Erreur: ${err.message}`);
      }
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterStatus(e.target.value);
  };

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getInitials = (nom) => {
    return nom
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Gestion du modal
  const handleOpenModal = () => {
    setShowModal(true);
    setFormData({
      prenom: '',
      nom: '',
      tel: '',
      email: '',
      password: ''
    });
    setFormErrors({});
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      prenom: '',
      nom: '',
      tel: '',
      email: '',
      password: ''
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ modifié
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.prenom.trim()) {
      errors.prenom = 'Le prénom est requis';
    }

    if (!formData.nom.trim()) {
      errors.nom = 'Le nom est requis';
    }

    if (!formData.tel.trim()) {
      errors.tel = 'Le téléphone est requis';
    } else if (!/^(77|78|76|70|75)[0-9]{7}$/.test(formData.tel)) {
      errors.tel = 'Format de téléphone invalide (ex: 771234567)';
    }

    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format email invalide';
    }

    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await apiService.users.create({
        ...formData,
        type: 'CLIENT'
      });

      alert('Client créé avec succès !');
      handleCloseModal();
      await loadClients(); // Recharger la liste
    } catch (err) {
      alert(`Erreur lors de la création: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement des clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Erreur: {error}
          <button 
            className="btn btn-sm btn-outline-danger ms-3"
            onClick={loadClients}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Gestion des Clients</h2>
          <p className="text-muted mb-0">
            {filteredClients.length} client(s) • Page {currentPage} sur {totalPages}
          </p>
        </div>
        <button className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          Nouveau Client
        </button>
      </div>

      {/* Filtres */}
      <div className="card custom-card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par nom, téléphone ou email..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select 
                className="form-select"
                value={filterStatus}
                onChange={handleFilterChange}
              >
                <option value="all">Tous les statuts</option>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
            <div className="col-md-3">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={loadClients}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Actualiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table des clients */}
      <div className="card custom-card">
        <div className="card-body p-0">
          {currentClients.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people fs-1 text-muted"></i>
              <p className="mt-3 text-muted">Aucun client trouvé</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table custom-table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th>Solde</th>
                    <th>Statut</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentClients.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px', fontWeight: 'bold', fontSize: '0.9rem' }}
                          >
                            {getInitials(client.nom)}
                          </div>
                          <div>
                            <div className="fw-semibold">{client.nom}</div>
                            <small className="text-muted">ID: {client.id.slice(-8)}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <i className="bi bi-telephone me-2 text-muted"></i>
                        {client.telephone}
                      </td>
                      <td>
                        <i className="bi bi-envelope me-2 text-muted"></i>
                        {client.email}
                      </td>
                      <td>
                        <span className="fw-semibold text-success">
                          {client.solde.toLocaleString('fr-FR')} FCFA
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${client.status === 'Actif' ? 'bg-success' : 'bg-danger'}`}>
                          {client.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            className="btn btn-outline-primary"
                            title="Voir détails"
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                          <button
                            className={`btn ${client.isBlocked ? 'btn-outline-success' : 'btn-outline-warning'}`}
                            onClick={() => handleBlock(client.id, client.nom, client.isBlocked)}
                            title={client.isBlocked ? 'Débloquer' : 'Bloquer'}
                          >
                            <i className={`bi ${client.isBlocked ? 'bi-unlock' : 'bi-lock'}`}></i>
                          </button>
                          <button
                            className="btn btn-outline-danger"
                            onClick={() => handleDelete(client.id, client.nom)}
                            title="Supprimer"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-white">
            <nav>
              <ul className="pagination custom-pagination justify-content-center mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                </li>
                
                {[...Array(totalPages)].map((_, index) => (
                  <li
                    key={index + 1}
                    className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => handlePageChange(index + 1)}
                    >
                      {index + 1}
                    </button>
                  </li>
                ))}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Stats rapides */}
      <div className="row mt-4">
        <div className="col-md-4">
          <div className="card custom-card text-center">
            <div className="card-body">
              <i className="bi bi-people-fill fs-1 text-primary mb-2"></i>
              <h3 className="mb-0">{clients.length}</h3>
              <p className="text-muted mb-0">Total Clients</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card custom-card text-center">
            <div className="card-body">
              <i className="bi bi-check-circle-fill fs-1 text-success mb-2"></i>
              <h3 className="mb-0">
                {clients.filter(c => c.status === 'Actif').length}
              </h3>
              <p className="text-muted mb-0">Clients Actifs</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card custom-card text-center">
            <div className="card-body">
              <i className="bi bi-x-circle-fill fs-1 text-danger mb-2"></i>
              <h3 className="mb-0">
                {clients.filter(c => c.status === 'Inactif').length}
              </h3>
              <p className="text-muted mb-0">Clients Inactifs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clients;