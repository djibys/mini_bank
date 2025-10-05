import React from 'react';

const CircularStatCard = ({ title, value, color, icon, percentage = 75 }) => {
  return (
    <div className="circular-stat-card">
      <div className="circular-stat-wrapper">
        {/* Cercle avec bordure colorée */}
        <div className="circular-border" style={{ 
          background: `conic-gradient(${color} ${percentage * 3.6}deg, #e9ecef ${percentage * 3.6}deg)` 
        }}>
          <div className="circular-inner">
            <div className="stat-content text-center">
              <div className="stat-icon-circle mb-2" style={{ backgroundColor: `${color}15` }}>
                <i className={`bi ${icon}`} style={{ color, fontSize: '2rem' }}></i>
              </div>
              <h3 className="stat-value mb-1 fw-bold" style={{ color }}>{value}</h3>
              <p className="stat-title text-muted small mb-0">{title}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CircularStatCard;
