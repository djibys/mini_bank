import React from 'react';
import '../../styles/custom.css';

const Sidebar = ({ activeTab, setActiveTab, isCollapsed, toggleCollapse }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
    { id: 'clients', label: 'Clients', icon: 'bi-people' },
    { id: 'distributeurs', label: 'Distributeurs', icon: 'bi-person-check' },
    { id: 'transactions', label: 'Historiques', icon: 'bi-credit-card' },
    { id: 'annulation', label: 'Annulations', icon: 'bi-x-circle' },
    { id: 'depot', label: 'Dépôt', icon: 'bi-plus-circle' },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-hidden' : ''}`}>
      {/* Header avec logo et bouton toggle */}
      <div className="sidebar-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="sidebar-logo">
              <i className="bi bi-currency-dollar"></i>
            </div>
            <div>
              <h5 className="sidebar-title">FinanceApp</h5>
              <small className="sidebar-subtitle">Gestion simplifiée</small>
            </div>
          </div>
          
          {/* Bouton Toggle à l'intérieur du sidebar */}
          <button
            className="btn-toggle-sidebar-inside"
            onClick={toggleCollapse}
            aria-label="Fermer le menu"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`}></i>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;