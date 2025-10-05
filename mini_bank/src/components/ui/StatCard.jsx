import React from 'react';

const StatCard = ({ title, value, color, icon }) => {
  return (
    <div className={`card custom-card stat-card h-100`} style={{ borderLeftColor: color }}>
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <p className="text-muted mb-2 small fw-medium">{title}</p>
            <h3 className="mb-0 fw-bold" style={{ color }}>{value}</h3>
          </div>
          <div className="stat-icon" style={{ backgroundColor: `${color}20` }}>
            <i className={`bi ${icon}`} style={{ color }}></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;