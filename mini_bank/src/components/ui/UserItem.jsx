import React from 'react';

const UserItem = ({ user }) => {
  // Déterminer le badge selon le type
  const getBadgeClass = (type) => {
    switch (type) {
      case 'CLIENT':
        return 'bg-primary';
      case 'DISTRIBUTEUR':
        return 'bg-purple';
      case 'AGENT':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  // Déterminer la couleur de l'avatar
  const getAvatarColor = (type) => {
    switch (type) {
      case 'CLIENT':
        return 'bg-primary';
      case 'DISTRIBUTEUR':
        return 'bg-purple';
      case 'AGENT':
        return 'bg-info';
      default:
        return 'bg-secondary';
    }
  };

  // Formatter la date
  const formatDate = (date) => {
    if (!date) return 'Jamais connecté';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir les initiales
  const getInitials = () => {
    const first = user.prenom?.charAt(0) || '';
    const last = user.nom?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="user-item p-3 border-bottom">
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3 flex-grow-1">
          {/* Avatar */}
          <div className={`user-avatar ${getAvatarColor(user.typeUtilisateur)}`}>
            {getInitials()}
          </div>

          {/* Infos utilisateur */}
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="fw-semibold">{user.prenom} {user.nom}</span>
              <span 
                className={`badge ${getBadgeClass(user.typeUtilisateur)}`}
                style={{ fontSize: '0.7rem' }}
              >
                {user.typeUtilisateur}
              </span>
              {user.isBlocked && (
                <span className="badge bg-danger" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-lock-fill me-1"></i>
                  Bloqué
                </span>
              )}
            </div>
            <div className="d-flex flex-column flex-md-row gap-md-3 text-muted small">
              <span>
                <i className="bi bi-envelope me-1"></i>
                {user.email}
              </span>
              <span>
                <i className="bi bi-telephone me-1"></i>
                {user.tel}
              </span>
              <span>
                <i className="bi bi-clock me-1"></i>
                {formatDate(user.lastLogin)}
              </span>
            </div>
          </div>
        </div>

        {/* Statut de connexion */}
        <div className="text-end d-none d-md-block">
          {user.lastLogin ? (
            <span className="badge bg-success-subtle text-success">
              <i className="bi bi-check-circle me-1"></i>
              Actif
            </span>
          ) : (
            <span className="badge bg-warning-subtle text-warning">
              <i className="bi bi-exclamation-circle me-1"></i>
              Jamais connecté
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserItem;