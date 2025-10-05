// components/Header.jsx
import React from 'react';
// Importation du nouveau composant UserMenu
import UserMenu from './UserMenu'; 

// Le Header ne gère plus que les props et le layout
const Header = ({ userName, profileImage, onLogout, onPhotoUpdateSuccess, onProfileClick, isSidebarCollapsed, onToggleSidebar }) => {
    
    return (
        <header className="app-header bg-white border-bottom">
            <div className="container-fluid">
                <div className="d-flex align-items-center justify-content-between py-3">
                    {/* Left Section - Bouton hamburger + Titre */}
                    <div className="d-flex align-items-center gap-3">
                        {/* Bouton hamburger visible uniquement quand sidebar fermé */}
                        {isSidebarCollapsed && (
                            <button
                                className="btn-hamburger"
                                onClick={onToggleSidebar}
                                aria-label="Ouvrir le menu"
                            >
                                <i className="bi bi-list"></i>
                            </button>
                        )}
                        <h3 className="mb-0 fw-bold text-dark">Dashboard</h3>
                    </div>

                    {/* Right Section - Profil utilisateur (UserMenu) */}
                    <UserMenu
                        userName={userName}
                        profileImage={profileImage}
                        onLogout={onLogout}
                        onProfileClick={onProfileClick}
                        onPhotoUpdateSuccess={onPhotoUpdateSuccess} 
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;