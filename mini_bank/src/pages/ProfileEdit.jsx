import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/apiService';

const ProfileEdit = ({ onProfileUpdate }) => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    tel: '',
    adresse: ''
  });
  
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});
  
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const user = apiService.auth.getCurrentUser();
    if (user) {
      setFormData({
        nom: user.nom || '',
        prenom: user.prenom || '',
        email: user.email || '',
        tel: user.tel || '',
        adresse: user.adresse || ''
      });
      // Utiliser directement photoUrl du backend ou construire l'URL correctement
      let photoUrl = null;
      if (user.photoUrl) {
        photoUrl = user.photoUrl;
      } else if (user.photo) {
        // Construire l'URL en s'assurant que le chemin est correct
        const cleanPath = user.photo.replace(/\\/g, '/');
        photoUrl = cleanPath.startsWith('http') ? cleanPath : `http://localhost:3000/${cleanPath}`;
      }
      console.log('Photo chargée:', { photoUrl, userPhoto: user.photo, userPhotoUrl: user.photoUrl });
      setCurrentPhoto(photoUrl);
    }
  };
  
  const getInitials = () => {
    const first = formData.prenom?.charAt(0) || '';
    const last = formData.nom?.charAt(0) || '';
    return (first + last).toUpperCase() || 'U';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await apiService.users.updateProfile(formData);
      if (response.success) {
        const updatedUser = apiService.auth.getCurrentUser();
        const newUserData = {
          ...updatedUser,
          ...formData
        };
        localStorage.setItem('user', JSON.stringify(newUserData));
        
        // Appeler la fonction de mise à jour du parent pour rafraîchir l'affichage
        if (onProfileUpdate) {
          onProfileUpdate(newUserData);
        }
        
        setSuccess('Profil mis à jour avec succès!');
        setTimeout(() => setSuccess(null), 3000);
        
        // Recharger les données du profil pour afficher les modifications
        loadUserData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef(null);
  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5MB');
      return;
    }
    const formData = new FormData();
    formData.append('profilePicture', file);

    setUploading(true);
    setError(null);

    try {
      const response = await apiService.users.updateProfilePicture(formData);
      console.log('Réponse upload photo:', response);
      
      if (response.success && response.data?.photoUrl) {
        // L'API retourne déjà une URL absolue (voir backend userController)
        setCurrentPhoto(response.data.photoUrl);
        
        // Mettre à jour le localStorage avec la nouvelle photo
        const currentUser = apiService.auth.getCurrentUser();
        if (currentUser) {
          currentUser.photoUrl = response.data.photoUrl;
          currentUser.photo = response.data.photoUrl;
          localStorage.setItem('user', JSON.stringify(currentUser));
          
          // Appeler la fonction de mise à jour du parent pour rafraîchir l'affichage
          if (onProfileUpdate) {
            onProfileUpdate(currentUser);
          }
        }
        
        setSuccess('Photo mise à jour avec succès!');
        setTimeout(() => setSuccess(null), 3000);
        
        // Recharger les données pour afficher les modifications
        loadUserData();
      }
    } catch (err) {
      console.error('Erreur upload:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };


  const handlePhotoDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer votre photo de profil?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await apiService.users.deleteProfilePicture();
      setCurrentPhoto(null);
      
      // Mettre à jour le localStorage
      const currentUser = apiService.auth.getCurrentUser();
      if (currentUser) {
        currentUser.photoUrl = null;
        currentUser.photo = null;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        // Appeler la fonction de mise à jour du parent pour rafraîchir l'affichage
        if (onProfileUpdate) {
          onProfileUpdate(currentUser);
        }
      }
      
      setSuccess('Photo supprimée avec succès!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Recharger les données pour afficher les modifications
      loadUserData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-lg-10 mx-auto">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="fw-bold text-gradient mb-2">Mon Profil</h2>
              <p className="text-muted">Gérez vos informations personnelles</p>
            </div>
          </div>

          {success && (
            <div className="alert alert-success alert-dismissible fade show">
              <i className="bi bi-check-circle me-2"></i>
              {success}
            </div>
          )}

          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="row g-4">
            {/* Photo de profil */}
            <div className="col-lg-4">
              <div className="custom-card h-100">
                <div className="card-body text-center">
                  <h5 className="mb-4">Photo de Profil</h5>

                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt="Photo de profil"
                      className="rounded-circle mb-3 border border-4 border-primary"
                      style={{ 
                        width: '200px', 
                        height: '200px', 
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }}
                      onClick={handlePhotoClick}
                    />
                  ) : (
                    <div
                      className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3 border border-4 border-primary"
                      style={{ 
                        width: '200px', 
                        height: '200px', 
                        fontSize: '4rem', 
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                      onClick={handlePhotoClick}
                    >
                      {getInitials()}
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />

                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={handlePhotoClick}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Téléchargement...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cloud-upload me-2"></i>
                          {currentPhoto ? 'Changer la photo' : 'Ajouter une photo'}
                        </>
                      )}
                    </button>

                    {currentPhoto && (
                      <button
                        className="btn btn-outline-danger"
                        onClick={handlePhotoDelete}
                        disabled={uploading}
                      >
                        <i className="bi bi-trash me-2"></i>
                        Supprimer la photo
                      </button>
                    )}
                  </div>

                  <small className="text-muted d-block mt-3">
                    Format accepté: JPG, PNG, GIF<br/>
                    Taille max: 5MB
                  </small>
                </div>
              </div>
            </div>

            {/* Formulaire d'édition */}
            <div className="col-lg-8">
              <div className="custom-card">
                <div className="card-body">
                  <h5 className="mb-4">Informations Personnelles</h5>

                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
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
                          disabled={loading}
                        />
                        {errors.prenom && (
                          <div className="invalid-feedback">{errors.prenom}</div>
                        )}
                      </div>

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
                          disabled={loading}
                        />
                        {errors.nom && (
                          <div className="invalid-feedback">{errors.nom}</div>
                        )}
                      </div>

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
                          disabled={loading}
                        />
                        {errors.email && (
                          <div className="invalid-feedback">{errors.email}</div>
                        )}
                      </div>

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
                          disabled={loading}
                        />
                        {errors.tel && (
                          <div className="invalid-feedback">{errors.tel}</div>
                        )}
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">Adresse</label>
                        <input
                          type="text"
                          name="adresse"
                          className="form-control"
                          value={formData.adresse}
                          onChange={handleChange}
                          disabled={loading}
                        />
                      </div>
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
                            Enregistrer les modifications
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={loadUserData}
                        disabled={loading}
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
      </div>
    </div>
  );
};

export default ProfileEdit;