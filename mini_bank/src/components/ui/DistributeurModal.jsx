import React, { useState, useEffect } from 'react';

const DistributeurModal = ({ isOpen, onClose, onSubmit, distributeur = null }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    tel: '',
    adresse: '',
    NcarteIdentite: '',
    dateNaissance: '',
    pwd: 'Distributeur@123'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Remplir le formulaire si on édite un distributeur
  useEffect(() => {
    if (distributeur) {
      setFormData({
        nom: distributeur.nomFamille || distributeur.nom?.split(' ')[1] || '',
        prenom: distributeur.prenom || distributeur.nom?.split(' ')[0] || '',
        email: distributeur.email || '',
        tel: distributeur.telephone || '',
        adresse: distributeur.zone || '',
        NcarteIdentite: distributeur.NcarteIdentite || '',
        dateNaissance: '',
        pwd: 'Distributeur@123'
      });
    } else {
      // Réinitialiser le formulaire si nouveau distributeur
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        tel: '',
        adresse: '',
        NcarteIdentite: '',
        dateNaissance: '',
        pwd: 'Distributeur@123'
      });
    }
  }, [distributeur, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Effacer l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.prenom.trim()) newErrors.prenom = 'Prénom requis';
    if (!formData.nom.trim()) newErrors.nom = 'Nom requis';
    if (!formData.email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.tel.trim()) newErrors.tel = 'Téléphone requis';
    if (!formData.adresse.trim()) newErrors.adresse = 'Adresse/Zone requis';
    
    // Validation obligatoire uniquement pour un nouveau distributeur
    if (!distributeur) {
      if (!formData.NcarteIdentite.trim()) {
        newErrors.NcarteIdentite = 'N° carte identité requis';
      }
      
      // Validation de la date de naissance et de l'âge minimum
      if (!formData.dateNaissance) {
        newErrors.dateNaissance = 'Date de naissance requise';
      } else {
        const birthDate = new Date(formData.dateNaissance);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        // Ajuster l'âge si l'anniversaire n'est pas encore passé cette année
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (age < 18) {
          newErrors.dateNaissance = 'Vous devez avoir au moins 18 ans';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
      setFormData({
        nom: '',
        prenom: '',
        email: '',
        tel: '',
        adresse: '',
        NcarteIdentite: '',
        dateNaissance: '',
        pwd: 'Distributeur@123'
      });
      setErrors({});
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      tel: '',
      adresse: '',
      NcarteIdentite: '',
      dateNaissance: '',
      pwd: 'Distributeur@123'
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={(e) => {
        // Fermer si clic sur l'overlay
        if (e.target.className === 'modal-overlay') {
          handleClose();
        }
      }}
    >
      <div 
        className="modal-content custom-card" 
        style={{
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="card-header bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-person-plus-fill me-2"></i>
              {distributeur ? 'Modifier' : 'Nouveau'} Distributeur
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white"
              onClick={handleClose}
            ></button>
          </div>
        </div>

        <div className="card-body">
          {errors.submit && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {errors.submit}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              {/* Prénom */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Prénom <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="prenom"
                  className={`form-control ${errors.prenom ? 'is-invalid' : ''}`}
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Ex: Mamadou"
                />
                {errors.prenom && <div className="invalid-feedback">{errors.prenom}</div>}
              </div>

              {/* Nom */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Nom <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  className={`form-control ${errors.nom ? 'is-invalid' : ''}`}
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Ex: Diallo"
                />
                {errors.nom && <div className="invalid-feedback">{errors.nom}</div>}
              </div>

              {/* Email */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Ex: mamadou@example.com"
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              {/* Téléphone */}
              <div className="col-md-6">
                <label className="form-label fw-semibold">
                  Téléphone <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  name="tel"
                  className={`form-control ${errors.tel ? 'is-invalid' : ''}`}
                  value={formData.tel}
                  onChange={handleChange}
                  placeholder="Ex: 77 123 45 67"
                />
                {errors.tel && <div className="invalid-feedback">{errors.tel}</div>}
              </div>

              {/* Carte d'identité - seulement pour nouveau */}
              {!distributeur && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    N° Carte d'Identité <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="NcarteIdentite"
                    className={`form-control ${errors.NcarteIdentite ? 'is-invalid' : ''}`}
                    value={formData.NcarteIdentite}
                    onChange={handleChange}
                    placeholder="Ex: 1234567890123"
                  />
                  {errors.NcarteIdentite && <div className="invalid-feedback">{errors.NcarteIdentite}</div>}
                </div>
              )}

              {/* Date de naissance - seulement pour nouveau */}
              {!distributeur && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">
                    Date de Naissance <span className="text-danger">*</span>
                  </label>
                  <input
                    type="date"
                    name="dateNaissance"
                    className={`form-control ${errors.dateNaissance ? 'is-invalid' : ''}`}
                    value={formData.dateNaissance}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {errors.dateNaissance && <div className="invalid-feedback">{errors.dateNaissance}</div>}
                </div>
              )}

              {/* Adresse/Zone */}
              <div className="col-12">
                <label className="form-label fw-semibold">
                  Zone / Adresse <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="adresse"
                  className={`form-control ${errors.adresse ? 'is-invalid' : ''}`}
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Ex: Dakar Plateau, Parcelles Assainies..."
                />
                {errors.adresse && <div className="invalid-feedback">{errors.adresse}</div>}
              </div>

              {!distributeur && (
                <div className="col-12">
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>Mot de passe par défaut :</strong> Distributeur@123
                    <br />
                    <small>Le distributeur devra le changer lors de sa première connexion.</small>
                  </div>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mt-4">
              <button 
                type="submit" 
                className="btn btn-primary flex-fill"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-2"></i>
                    {distributeur ? 'Mettre à jour' : 'Créer le distributeur'}
                  </>
                )}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DistributeurModal;