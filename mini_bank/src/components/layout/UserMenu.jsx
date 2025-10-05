import React, { useState, useEffect, useRef } from 'react';
import apiService from '../../services/apiService';

const UserMenu = ({ userName, profileImage, onLogout, onProfileClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(profileImage);
  const menuRef = useRef(null);

  useEffect(() => {
    setCurrentPhoto(profileImage);
  }, [profileImage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setMenuOpen(false);
    if (onProfileClick) onProfileClick();
  };

  const handleLogoutClick = () => {
    setMenuOpen(false);
    if (onLogout) onLogout();
  };
  const getInitials = () => {
    if (!userName) return 'U';
    return userName.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Utiliser l'URL telle quelle si elle est absolue, sinon préfixer avec le backend
  const photoUrl = currentPhoto
    ? (typeof currentPhoto === 'string' && /^https?:\/\//i.test(currentPhoto)
        ? currentPhoto
        : `http://localhost:3000/${currentPhoto.replace(/^\//, '')}`.replace(/\\/g, '/'))
    : null;
  
  console.log('UserMenu photo:', { currentPhoto, photoUrl });

  return (
    <div className="position-relative" ref={menuRef}>
      <div
        className="d-flex align-items-center gap-2"
        onClick={() => setMenuOpen(!menuOpen)}
        style={{ cursor: 'pointer' }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Profil"
            className="rounded-circle"
            width="40"
            height="40"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
            style={{ width: '40px', height: '40px', fontWeight: 'bold' }}
          >
            {getInitials()}
          </div>
        )}
        <span className="fw-medium text-dark d-none d-sm-inline">{userName}</span>
        <i className="bi bi-chevron-down text-muted"></i>
      </div>

      {menuOpen && (
        <div className="dropdown-menu show position-absolute end-0 mt-2 shadow-sm">
          <button className="dropdown-item" onClick={handleProfileClick}>
            <i className="bi bi-person-circle me-2"></i>
            Mon Profil
          </button>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item" onClick={handleLogoutClick}>
            <i className="bi bi-box-arrow-right me-2"></i>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu; 