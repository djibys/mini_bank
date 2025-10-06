import React, { useState } from 'react';
import apiService from '../services/apiService';

const Login = ({ onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    pwd: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isWakingServer, setIsWakingServer] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Vérifier si on utilise Render (serveur peut être en veille)
    const isRenderServer = process.env.REACT_APP_API_URL?.includes('onrender.com');

    try {
      // Message d'information si serveur Render
      if (isRenderServer) {
        setIsWakingServer(true);
        setError('info'); // Flag spécial pour message bleu
      }

      const response = await apiService.auth.login(formData);
      
      if (response.success) {
        onLoginSuccess(response.data.user);
      } else {
        setError(response.message || 'Échec de la connexion');
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      
      // Messages d'erreur plus explicites
      if (err.message?.includes('fetch') || err.message?.includes('Failed to fetch')) {
        setError('❌ Impossible de se connecter au serveur. Le serveur est peut-être en veille (Render Free tier). Patientez 30-60 secondes et réessayez.');
      } else if (err.message?.includes('timeout') || err.message?.includes('Timeout')) {
        setError('⏱️ Le serveur met trop de temps à répondre. Il est probablement en veille. Réessayez dans quelques instants.');
      } else if (err.message?.includes('400')) {
        setError('🔑 Email ou mot de passe incorrect. Vérifiez vos identifiants.');
      } else if (err.message?.includes('401')) {
        setError('🔒 Accès refusé. Vérifiez votre email et mot de passe.');
      } else if (err.message?.includes('404')) {
        setError('🔍 Endpoint API introuvable. Vérifiez la configuration de l\'API.');
      } else if (err.message?.includes('500')) {
        setError('⚠️ Erreur serveur. Contactez l\'administrateur.');
      } else {
        setError(err.message || 'Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
      setIsWakingServer(false);
    }
  };

  return (
    <div className="login-container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)' }}>
      <div className="card shadow-lg" style={{ maxWidth: '450px', width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
              <i className="bi bi-currency-dollar text-primary fs-1"></i>
            </div>
            <h2 className="fw-bold">FinanceApp</h2>
            <p className="text-muted">Connectez-vous à votre compte</p>
          </div>

          {/* Message d'information pour serveur en veille */}
          {isWakingServer && error === 'info' && (
            <div className="alert alert-info" role="alert">
              <div className="d-flex align-items-center">
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <div>
                  <strong>Réveil du serveur en cours...</strong>
                  <br />
                  <small>Cela peut prendre 30-60 secondes (serveur gratuit Render)</small>
                </div>
              </div>
            </div>
          )}

          {/* Messages d'erreur */}
          {error && error !== 'info' && (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Email</label>
              <input
                type="email"
                name="email"
                className="form-control form-control-lg"
                placeholder="votre@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Mot de passe</label>
              <input
                type="password"
                name="pwd"
                className="form-control form-control-lg"
                placeholder="••••••••"
                value={formData.pwd}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  {isWakingServer ? 'Réveil du serveur...' : 'Connexion...'}
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Se connecter
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="text-muted">
              Pas de compte ? <a href="#" className="text-primary" onClick={(e) => e.preventDefault()}>Contactez un administrateur</a>
            </small>
          </div>

          {/* Indicateur de debug en mode développement */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-center mt-3">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                API: {process.env.REACT_APP_API_URL || 'localhost:3000/api'}
              </small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;