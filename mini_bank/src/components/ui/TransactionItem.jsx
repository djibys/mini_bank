import React from 'react';

const TransactionItem = ({ name, type, time, amount }) => {
  const isPositive = amount > 0;
  const bgColor = isPositive ? 'bg-success' : 'bg-danger';
  const textColor = isPositive ? 'text-success' : 'text-danger';

  return (
    <div className="transaction-item p-3">
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-3">
          <div className={`transaction-avatar ${bgColor}`}>
            {name.charAt(0)}
          </div>
          <div>
            <div className="fw-semibold">{name}</div>
            <small className="text-muted">{type} - {time}</small>
          </div>
        </div>
        <div className={`fw-bold fs-5 ${textColor}`}>
          {isPositive ? '+' : ''}{amount.toLocaleString()} F
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;