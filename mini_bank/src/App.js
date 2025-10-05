import React, { useState, useEffect } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Distributeurs from './pages/Distributeurs';
import Transactions from './pages/Transactions';
import Annulation from './pages/Annulation';
import Depot from './pages/Depot';
import Login from './pages/Login';
import apiService from './services/apiService';
import ProfileEdit from './pages/ProfileEdit';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const user = apiService.auth.getCurrentUser();
    const token = localStorage.getItem('token');
    
    if (user && token) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    } else {
      // S'assurer que l'utilisateur est déconnecté au démarrage si pas de token
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  }, []);

  // Adapter isCollapsed selon la taille d'écran
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 992) {
        setIsCollapsed(false);
        document.body.classList.remove('sidebar-collapsed');
      } else {
        setIsCollapsed(true);
        document.body.classList.add('sidebar-collapsed');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Écouter les changements de photo de profil
  useEffect(() => {
    const onProfilePhotoUpdated = (event) => {
      const { photoUrl } = event.detail || {};
      if (photoUrl) {
        handlePhotoUpdate(photoUrl);
      }
    };

    window.addEventListener('profilePhotoUpdated', onProfilePhotoUpdated);
    
    return () => window.removeEventListener('profilePhotoUpdated', onProfilePhotoUpdated);
  }, []);

  // Déconnexion automatique après 2 minutes d'inactivité
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes en millisecondes

    const resetTimer = () => {
      // Effacer le timer existant
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }

      // Créer un nouveau timer
      inactivityTimer = setTimeout(() => {
        // Déconnecter l'utilisateur
        handleLogout();
        alert('Vous avez été déconnecté pour cause d\'inactivité (2 minutes).');
      }, INACTIVITY_TIMEOUT);
    };

    // Événements qui réinitialisent le timer
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Ajouter les écouteurs d'événements
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    // Démarrer le timer initial
    resetTimer();

    // Nettoyage
    return () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [isAuthenticated]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      
      if (newState) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
      
      return newState;
    });
  };

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await apiService.auth.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setActiveTab('dashboard');
    }
  };

  // ✅ AJOUTÉ: Fonction pour mettre à jour la photo de profil
  const handlePhotoUpdate = (newPhotoUrl) => {
    setCurrentUser(prev => ({
      ...prev,
      photo: newPhotoUrl,
      photoUrl: newPhotoUrl
    }));
    
    // Mettre à jour localStorage
    const updatedUser = {
      ...currentUser,
      photo: newPhotoUrl,
      photoUrl: newPhotoUrl
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // ✅ AJOUTÉ: Fonction pour mettre à jour le profil complet
  const handleProfileUpdate = (updatedData) => {
    const updatedUser = {
      ...currentUser,
      ...updatedData
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'distributeurs':
        return <Distributeurs />;
      case 'transactions':
        return <Transactions />;
      case 'annulation':
        return <Annulation />;
      case 'depot':
        return <Depot />;
      case 'ProfileEdit':  // ✅ CORRIGÉ: minuscule cohérente
        return <ProfileEdit onProfileUpdate={handleProfileUpdate} />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className={`app-container ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      
      <div className="main-wrapper">
        <Header 
          userName={`${currentUser?.prenom || ''} ${currentUser?.nom || ''}`}
          profileImage={currentUser?.photoUrl || currentUser?.photo}
          onLogout={handleLogout}
          onProfileClick={() => setActiveTab('ProfileEdit')}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={toggleCollapse}
          onPhotoUpdateSuccess={handlePhotoUpdate}
        />
        
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;