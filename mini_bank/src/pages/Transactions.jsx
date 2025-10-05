import React, { useState, useEffect } from 'react';
import { Pagination } from '../components';
import { usePagination } from '../hooks/usePagination';
import apiService from '../services/apiService';

const Transactions = () => {
    // État principal pour stocker toutes les transactions récupérées de l'API
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // États de filtrage
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        loadTransactions();
    }, []);
    
    // --- FONCTION DE CHARGEMENT DES TRANSACTIONS (Mise à jour pour l'API) ---
    const loadTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            // Utilisation de l'API réelle pour récupérer toutes les transactions
            const responseData = await apiService.transactions.getAll(); 
            
            // Assurez-vous que la structure de la réponse correspond à ce qui est attendu
            // Si votre API retourne les transactions directement dans 'responseData.transactions'
            const fetchedTransactions = responseData.transactions || [];

            // IMPORTANT : Mapper et uniformiser la structure si nécessaire
            // L'API transactions.getAll retourne des objets transaction bruts,
            // contrairement aux objets fictifs créés précédemment.
            // Nous supposons que l'API renvoie des objets ayant au moins:
            // _id, numeroTransaction, typeTransaction, montant, dateTransaction, statut, client
            
            const standardizedTransactions = fetchedTransactions.map(t => ({
                id: t.numeroTransaction || t._id,
                userId: t.client?._id,
                userName: t.nomClient || 'N/A', // Assurez-vous que le backend fournit nomClient
                userEmail: t.client?.email || 'N/A',
                type: t.typeTransaction,
                montant: t.montant,
                date: t.dateTransaction,
                statut: t.statut,
                numeroCompte: t.numeroCompte || 'N/A',
            }));

            setTransactions(standardizedTransactions);

        } catch (err) {
            console.error('Erreur chargement transactions API:', err);
            // L'apiService renvoie déjà un objet Error avec le message du serveur
            setError(err.message || 'Erreur lors du chargement des transactions.');
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les transactions (la logique reste la même)
    const filteredTransactions = transactions.filter(transaction => {
        const matchSearch = 
            transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchType = filterType === 'all' || transaction.type === filterType;
        
        const matchDate = !filterDate || 
            new Date(transaction.date).toISOString().split('T')[0] === filterDate;
        
        return matchSearch && matchType && matchDate;
    });

    // Pagination (utilise les transactions filtrées)
    const {
        currentPage,
        totalPages,
        startIndex,
        endIndex,
        currentItems: currentTransactions,
        handlePageChange
    } = usePagination(filteredTransactions, 10);

    // Calculer les statistiques
    const stats = {
        total: filteredTransactions.length,
        depots: filteredTransactions.filter(t => t.type === 'DEPOT').length,
        retraits: filteredTransactions.filter(t => t.type === 'RETRAIT').length,
        montantTotal: filteredTransactions.reduce((sum, t) => sum + t.montant, 0),
        validees: filteredTransactions.filter(t => t.statut === 'VALIDEE').length,
        enAttente: filteredTransactions.filter(t => t.statut === 'EN_ATTENTE').length
    };

    // --- RENDU : CHARGEMENT ET ERREUR ---
    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Chargement...</span>
                        </div>
                        <p className="text-muted">Chargement des transactions...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Erreur de l'API :</strong> {error}
                    <button className="btn btn-sm btn-outline-danger ms-3" onClick={loadTransactions}>
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    // --- RENDU : INTERFACE PRINCIPALE ---
    return (
        <div className="container-fluid py-4">
            {/* Statistiques rapides */}
            <div className="row g-3 mb-4">
                {/* ... (Blocs de statistiques inchangés) ... */}
                <div className="col-6 col-md-3">
                    <div className="card custom-card border-start border-primary border-4">
                        <div className="card-body">
                            <div className="text-muted small">Total transactions</div>
                            <div className="fs-4 fw-bold text-primary">{stats.total}</div>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card custom-card border-start border-success border-4">
                        <div className="card-body">
                            <div className="text-muted small">Dépôts</div>
                            <div className="fs-4 fw-bold text-success">{stats.depots}</div>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card custom-card border-start border-danger border-4">
                        <div className="card-body">
                            <div className="text-muted small">Retraits</div>
                            <div className="fs-4 fw-bold text-danger">{stats.retraits}</div>
                        </div>
                    </div>
                </div>
                <div className="col-6 col-md-3">
                    <div className="card custom-card border-start border-info border-4">
                        <div className="card-body">
                            <div className="text-muted small">Montant total</div>
                            <div className="fs-6 fw-bold text-info">{stats.montantTotal.toLocaleString()} FCFA</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Header avec filtres */}
            <div className="card custom-card mb-4">
                <div className="card-body">
                    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-4">
                        <div className="d-flex align-items-center gap-3">
                            <i className="bi bi-credit-card text-primary fs-2"></i>
                            <div>
                                <h3 className="mb-0 fw-bold">Historique des Transactions</h3>
                                <small className="text-muted">{filteredTransactions.length} transaction(s)</small>
                            </div>
                        </div>
                        <button className="btn btn-outline-primary" onClick={loadTransactions}>
                            <i className="bi bi-arrow-clockwise me-2"></i>
                            Actualiser
                        </button>
                    </div>

                    {/* Filtres */}
                    <div className="row g-3">
                        <div className="col-12 col-md-5">
                            <div className="input-group">
                                <span className="input-group-text bg-white">
                                    <i className="bi bi-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Rechercher par ID, nom, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-6 col-md-3">
                            <select 
                                className="form-select"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">Tous les types</option>
                                <option value="DEPOT">Dépôts</option>
                                <option value="RETRAIT">Retraits</option>
                            </select>
                        </div>
                        <div className="col-6 col-md-3">
                            <input 
                                type="date" 
                                className="form-control"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        <div className="col-12 col-md-1">
                            {(searchTerm || filterType !== 'all' || filterDate) && (
                                <button 
                                    className="btn btn-outline-secondary w-100"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterType('all');
                                        setFilterDate('');
                                    }}
                                    title="Réinitialiser les filtres"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tableau des transactions */}
            <div className="card custom-card mb-4">
                <div className="table-responsive">
                    <table className="table table-hover custom-table mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>ID Transaction</th>
                                <th>Utilisateur</th>
                                <th>Type</th>
                                <th>Date & Heure</th>
                                <th>Montant</th>
                                <th>Statut</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentTransactions.length > 0 ? (
                                currentTransactions.map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td className="fw-bold text-primary">{transaction.id}</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <div 
                                                    className={`${transaction.type === 'DEPOT' ? 'bg-success' : 'bg-danger'} text-white rounded-circle d-flex align-items-center justify-content-center fw-bold`} 
                                                    style={{width: '35px', height: '35px', fontSize: '0.9rem'}}
                                                >
                                                    {transaction.userName.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div>
                                                    <div className="fw-semibold">{transaction.userName}</div>
                                                    <small className="text-muted">{transaction.userEmail}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${transaction.type === 'DEPOT' ? 'bg-success' : 'bg-danger'}`}>
                                                <i className={`bi ${transaction.type === 'DEPOT' ? 'bi-arrow-down' : 'bi-arrow-up'} me-1`}></i>
                                                {transaction.type}
                                            </span>
                                        </td>
                                        <td className="text-muted">
                                            {new Date(transaction.date).toLocaleString('fr-FR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className={`fw-bold ${transaction.type === 'DEPOT' ? 'text-success' : 'text-danger'}`}>
                                            {transaction.type === 'DEPOT' ? '+' : '-'}{transaction.montant.toLocaleString()} FCFA
                                        </td>
                                        <td>
                                            {transaction.statut === 'VALIDEE' ? (
                                                <span className="badge bg-success">
                                                    <i className="bi bi-check-circle me-1"></i>
                                                    Validée
                                                </span>
                                            ) : (
                                                <span className="badge bg-warning">
                                                    <i className="bi bi-clock me-1"></i>
                                                    En attente
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <div className="btn-group btn-group-sm">
                                                <button className="btn btn-outline-primary" title="Détails">
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                <button className="btn btn-outline-secondary" title="Imprimer reçu">
                                                    <i className="bi bi-printer"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="text-center py-5">
                                        <i className="bi bi-inbox fs-1 d-block mb-3 text-muted"></i>
                                        <p className="text-muted">
                                            {searchTerm || filterType !== 'all' || filterDate 
                                                ? 'Aucune transaction trouvée avec ces critères' 
                                                : 'Aucune transaction disponible'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {filteredTransactions.length > 10 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    totalItems={filteredTransactions.length}
                    startIndex={startIndex}
                    endIndex={endIndex}
                />
            )}
        </div>
    );
};

export default Transactions;