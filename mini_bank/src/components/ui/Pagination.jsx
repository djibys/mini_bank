import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, startIndex, endIndex }) => {
  return (
    <div className="card custom-card">
      <div className="card-body">
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
          <div className="text-muted small">
            Affichage {startIndex + 1} à {Math.min(endIndex, totalItems)} sur {totalItems} éléments
          </div>

          <nav>
            <ul className="pagination mb-0 custom-pagination">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                  Précédent
                </button>
              </li>

              {[...Array(totalPages)].map((_, index) => (
                <li 
                  key={index}
                  className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}
                >
                  <button 
                    className="page-link"
                    onClick={() => onPageChange(index + 1)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}

              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                  <i className="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;